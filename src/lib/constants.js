// ── W1 constants ─────────────────────────────────────────────────
export const CH={youtube:{label:"YouTube",short:"YT",color:"#c0392b",bg:"#fdf2f2"},instagram:{label:"Instagram",short:"IG",color:"#8e44ad",bg:"#f8f3fc"},linkedin:{label:"LinkedIn",short:"LI",color:"#1a5276",bg:"#eaf2fb"},geral:{label:"Geral",short:"GL",color:"#555",bg:"#f4f4f3"}};
export const CTYPES=["Vídeo","Short","Reel","Carrossel","Post","Story","Live","Newsletter","Outro"];
export const EVT_ST={ideia:{label:"Ideia",color:"#888",bg:"#f4f4f3"},producao:{label:"Em produção",color:"#d68910",bg:"#fef9e7"},gravado:{label:"Gravado",color:"#1a5276",bg:"#eaf2fb"},editado:{label:"Editado",color:"#8e44ad",bg:"#f8f3fc"},publicado:{label:"Publicado",color:"#1e8449",bg:"#eafaf1"}};
export const EVT_ST_KEYS=["ideia","producao","gravado","editado","publicado"];
export const IDEA_NEXT={ideia:"producao",producao:"gravado",gravado:"editado",editado:"publicado"};
export const PROD_CHECKLIST=["Roteiro / estrutura definida","Gravação realizada","Edição concluída","Thumbnail criada (3 versões)","Teste A/B de thumbnail ativado","Descrição e timestamps escritos","Agendado no YouTube Studio","Publicado"];
export const CHECKLISTS_BY_TYPE={"Vídeo":["Roteiro / estrutura definida","Gravação realizada","Edição concluída","Thumbnail criada (3 versões)","Teste A/B de thumbnail ativado","Descrição e timestamps escritos","Agendado no YouTube Studio","Publicado"],"Short":["Roteiro definido","Gravação realizada","Edição concluída","Agendado","Publicado"],"Reel":["Roteiro definido","Gravação realizada","Edição concluída","Agendado","Publicado"],"Carrossel":["Conteúdo escrito","Design finalizado","Revisão","Publicado"],"Post":["Texto escrito","Design/imagem","Publicado"],"Story":["Conteúdo criado","Design","Publicado"],"Live":["Pauta definida","Setup técnico","Live realizada","Clips publicados"],"Newsletter":["Conteúdo escrito","Formatação","Revisão","Enviada"],"Outro":[]};
export const NOTE_CATS=["Geral","Roteiro","Pesquisa","Entrevista","Referência"];
export const PRIOS={alta:"#c0392b",media:"#d68910",baixa:"#1e8449"};
export const GCATS1=["Canal","Produto","Pessoal","Financeiro","Aprendizado"];
export const GUEST_ST={potencial:{label:"Potencial",color:"#888",bg:"#f4f4f3"},convidado:{label:"Convidado",color:"#1a5276",bg:"#eaf2fb"},confirmado:{label:"Confirmado",color:"#d68910",bg:"#fef9e7"},gravado:{label:"Gravado",color:"#8e44ad",bg:"#f8f3fc"},publicado:{label:"Publicado",color:"#1e8449",bg:"#eafaf1"},recusou:{label:"Recusou",color:"#c0392b",bg:"#fdf2f2"}};
export const GUEST_ST_KEYS=["potencial","convidado","confirmado","gravado","publicado","recusou"];
export const GUEST_NEXT={potencial:"convidado",convidado:"confirmado",confirmado:"gravado",gravado:"publicado"};
export const GUEST_PIPE_KEYS=["potencial","convidado","confirmado","gravado","publicado"];
export const GST={ativo:{label:"Ativo",c:"#1e8449"},pausado:{label:"Pausado",c:"#d68910"},concluido:{label:"Concluído",c:"#555"}};

// ── W2 constants ─────────────────────────────────────────────────
export const AREA_C={"Patagon AI":{color:"#1a5276",bg:"#eaf2fb"},"Mazul Solutions":{color:"#1e8449",bg:"#eafaf1"},"Indie":{color:"#8e44ad",bg:"#f5eef8"},"Marca Pessoal":{color:"#c0392b",bg:"#fdedec"}};
export const AREAS=Object.keys(AREA_C);
export const PL={idea:"Ideia",draft:"Rascunho",review:"Revisão",ready:"Pronto",published:"Publicado"};
export const PL_NEXT={idea:"draft",draft:"review",review:"ready",ready:"published"};
export const PL_COLS=["idea","draft","review","ready","published"];
export const TOOL_CYCLE={on:"warn",warn:"off",off:"on"};
export const TOOL_ST={on:{label:"On",bg:"#eafaf1",color:"#1e8449"},warn:{label:"Atenção",bg:"#fef9e7",color:"#d68910"},off:{label:"Off",bg:"#f4f4f3",color:"#888"}};
export const GCATS2=["Produto","Financeiro","Marca Pessoal","Aprendizado","Pessoal"];
export const CLIENT_ST={lead:{label:"Lead",color:"#888",bg:"#f4f4f3"},proposta:{label:"Proposta",color:"#1a5276",bg:"#eaf2fb"},negociacao:{label:"Negociação",color:"#d68910",bg:"#fef9e7"},fechado:{label:"Fechado",color:"#8e44ad",bg:"#f5eef8"},ativo:{label:"Ativo",color:"#1e8449",bg:"#eafaf1"},perdido:{label:"Perdido",color:"#c0392b",bg:"#fdf2f2"}};
export const CLIENT_PIPE_KEYS=["lead","proposta","negociacao","fechado","ativo"];
export const CLIENT_ST_KEYS=["lead","proposta","negociacao","fechado","ativo","perdido"];
export const CLIENT_NEXT={lead:"proposta",proposta:"negociacao",negociacao:"fechado",fechado:"ativo"};
export const NOTE_CATS_W2=["Geral","Reunião","Decisão","Referência"];
export const FREQ={daily:"Diário",weekly:"Semanal",biweekly:"Quinzenal",monthly:"Mensal"};

// ── Shared ───────────────────────────────────────────────────────
export const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const WDAYS=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// ── Nav & Workspaces ─────────────────────────────────────────────
export const W1_NAV=[{id:"home",label:"Foco do Dia",icon:"◈"},{id:"goals",label:"Metas",icon:"◎"},{id:"tasks",label:"Tasks",icon:"✓"},{id:"calendar",label:"Calendário",icon:"◫"},{id:"ideas",label:"Ideias",icon:"✦"},{id:"notes",label:"Notas",icon:"☰"},{id:"guests",label:"Convidados",icon:"◇"}];
export const W2_NAV=[{id:"home",label:"Foco do Dia",icon:"◈"},{id:"projects",label:"Projetos",icon:"⬡"},{id:"clients",label:"Clientes",icon:"◇"},{id:"tasks",label:"Tasks",icon:"✓"},{id:"personal",label:"Pessoal",icon:"○"},{id:"goals",label:"Metas",icon:"◎"},{id:"content",label:"Conteúdo",icon:"▷"},{id:"notes",label:"Notas",icon:"☰"},{id:"tools",label:"Ferramentas",icon:"⚙"}];
export const WS=[{id:"content",label:"Content OS",sub:"YT · IG · LinkedIn",icon:"C"},{id:"opb",label:"One Person Business",sub:"Patagon · Mazul · Indie",icon:"B"}];
