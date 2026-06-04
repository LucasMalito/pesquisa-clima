-- =====================================================================
-- Pesquisa de Clima no Zap — schema (Supabase projeto caixinha-botequim)
-- Prefixo clima_ isola das outras tabelas (cp_, rh_, radar_, etc).
-- Sistema interno/teste -> rodar SEM RLS por enquanto.
-- (Antes do rollout real pra clientes, ligar RLS — está exposto na web.)
-- =====================================================================

create table if not exists clima_pesquisas (
  id           text primary key,
  empresa      text,
  titulo       text,
  contexto     jsonb default '{}'::jsonb,
  focos        jsonb default '[]'::jsonb,
  perguntas    jsonb default '[]'::jsonb,
  funcionarios jsonb default '[]'::jsonb,
  anonima      boolean default false,
  status       text default 'rascunho',
  criado_em    bigint
);

create table if not exists clima_funcionarios (
  id        text primary key,
  empresa   text,
  nome      text,
  telefone  text,
  token     text
);
create index if not exists idx_clima_func_empresa on clima_funcionarios(empresa);
create index if not exists idx_clima_func_token   on clima_funcionarios(token);

create table if not exists clima_respostas (
  id          text primary key,
  pesquisa_id text references clima_pesquisas(id) on delete cascade,
  func_id     text,
  func_nome   text,
  itens       jsonb default '[]'::jsonb,
  criado_em   bigint
);
create index if not exists idx_clima_resp_pesquisa on clima_respostas(pesquisa_id);

-- Realtime opcional (dashboard atualiza sozinho):
-- alter publication supabase_realtime add table clima_respostas;
