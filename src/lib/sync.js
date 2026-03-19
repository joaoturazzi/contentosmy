'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const DEBOUNCE_MS = 400;
const MAX_RETRIES = 5;

function buildSnapshot(items) {
  const map = new Map();
  for (const item of items) {
    if (item.id) map.set(item.id, JSON.stringify(item));
  }
  return map;
}

function diffEntity(current, lastMap) {
  const upsert = [];
  const deleteIds = [];
  const currentIds = new Set();

  for (const item of current) {
    if (!item.id) continue;
    currentIds.add(item.id);
    const prev = lastMap.get(item.id);
    if (!prev || prev !== JSON.stringify(item)) {
      upsert.push(item);
    }
  }

  for (const id of lastMap.keys()) {
    if (!currentIds.has(id)) {
      deleteIds.push(id);
    }
  }

  return { upsert, delete: deleteIds };
}

export function useDatabaseSync(workspace, entities, initialState) {
  const [data, setDataRaw] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const pendingRef = useRef(new Set());
  const timerRef = useRef(null);
  const dataRef = useRef(data);
  const flushingRef = useRef(false);
  const dbReadyRef = useRef(false);
  const snapshotRef = useRef({});
  const channelRef = useRef(null);
  const retryCountRef = useRef({});
  dataRef.current = data;

  // BroadcastChannel setup — multi-tab sync
  useEffect(() => {
    try {
      const ch = new BroadcastChannel(`sync-${workspace}`);
      ch.onmessage = (e) => {
        const { entity, items } = e.data;
        if (entity && items && entities.includes(entity)) {
          setDataRaw(prev => ({ ...prev, [entity]: items }));
          snapshotRef.current[entity] = buildSnapshot(items);
        }
      };
      channelRef.current = ch;
      return () => ch.close();
    } catch {
      // BroadcastChannel not supported
    }
  }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load all entities from DB on mount
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        const results = await Promise.all(
          entities.map(e =>
            fetch(`/api/${workspace}/${e}`, { cache: 'no-store' }).then(r => {
              if (!r.ok) throw new Error(`Failed to load ${e}: ${r.status}`);
              return r.json();
            })
          )
        );
        if (cancelled) return;
        const fetched = {};
        entities.forEach((e, i) => {
          fetched[e] = results[i];
          snapshotRef.current[e] = buildSnapshot(results[i]);
        });
        console.log(`[sync] ${workspace} loaded:`, entities.map(e => `${e}(${fetched[e]?.length})`).join(', '));
        setDataRaw(fetched);
        dbReadyRef.current = true;
      } catch (err) {
        console.error(`[sync] Failed to load ${workspace}:`, err);
      }
      if (!cancelled) setLoaded(true);
    }
    loadAll();
    return () => { cancelled = true; };
  }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush pending syncs to DB — PATCH with diff when possible
  const flushSync = useCallback(async () => {
    if (flushingRef.current) return;
    if (!dbReadyRef.current) return;
    flushingRef.current = true;

    try {
      const pending = new Set(pendingRef.current);
      pendingRef.current.clear();
      if (!pending.size) return;

      const currentData = dataRef.current;
      for (const entity of pending) {
        const items = currentData[entity] || [];
        const lastMap = snapshotRef.current[entity];

        try {
          if (lastMap && lastMap.size > 0) {
            const diff = diffEntity(items, lastMap);
            if (!diff.upsert.length && !diff.delete.length) {
              console.log(`[sync] PATCH ${workspace}/${entity}: no changes`);
              continue;
            }
            console.log(`[sync] PATCH ${workspace}/${entity}: ${diff.upsert.length} upsert, ${diff.delete.length} delete`);
            const res = await fetch(`/api/${workspace}/${entity}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(diff),
              cache: 'no-store',
            });
            if (!res.ok) {
              const body = await res.text();
              throw new Error(`PATCH ${entity}: ${res.status} ${body}`);
            }
          } else {
            console.log(`[sync] PUT ${workspace}/${entity}: ${items.length} items (full)`);
            const res = await fetch(`/api/${workspace}/${entity}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(items),
              cache: 'no-store',
            });
            if (!res.ok) {
              const body = await res.text();
              throw new Error(`PUT ${entity}: ${res.status} ${body}`);
            }
          }
          // Update snapshot after success
          snapshotRef.current[entity] = buildSnapshot(items);
          retryCountRef.current[entity] = 0;
          // Broadcast to other tabs
          try { channelRef.current?.postMessage({ entity, items }); } catch {}
        } catch (err) {
          const rc = (retryCountRef.current[entity] || 0) + 1;
          retryCountRef.current[entity] = rc;
          if (rc < MAX_RETRIES) {
            console.warn(`[sync] Failed ${workspace}/${entity} (attempt ${rc}/${MAX_RETRIES}):`, err.message);
            pendingRef.current.add(entity);
          } else {
            console.error(`[sync] Giving up on ${workspace}/${entity} after ${MAX_RETRIES} attempts:`, err.message);
          }
        }
      }
    } finally {
      flushingRef.current = false;
      if (pendingRef.current.size > 0) {
        timerRef.current = setTimeout(() => flushSync(), DEBOUNCE_MS);
      }
    }
  }, [workspace]);

  // Wrapper around setDataRaw that detects changes and schedules sync
  const setData = useCallback((fn) => {
    setDataRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;

      for (const entity of entities) {
        if (next[entity] !== prev[entity]) {
          pendingRef.current.add(entity);
        }
      }

      if (pendingRef.current.size > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => flushSync(), DEBOUNCE_MS);
      }

      return next;
    });
  }, [entities, flushSync]);

  // Flush on beforeunload — keeps PUT for simplicity with keepalive
  useEffect(() => {
    const handler = () => {
      if (!dbReadyRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      const toFlush = new Set(pendingRef.current);
      if (!toFlush.size) return;
      pendingRef.current.clear();
      const currentData = dataRef.current;
      for (const entity of toFlush) {
        try {
          fetch(`/api/${workspace}/${entity}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData[entity] || []),
            keepalive: true,
          });
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [workspace]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return [data, setData, loaded];
}
