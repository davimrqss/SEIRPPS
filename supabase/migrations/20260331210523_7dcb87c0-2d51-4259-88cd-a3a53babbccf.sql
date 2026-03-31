
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor_financeiro', 'operador');

-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Caixas de Previdência
CREATE TABLE public.caixas_previdencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.caixas_previdencia ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  cargo TEXT,
  caixa_id UUID REFERENCES public.caixas_previdencia(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's caixa_id
CREATE OR REPLACE FUNCTION public.get_user_caixa_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT caixa_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Funcionários
CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  orgao TEXT NOT NULL,
  cargo TEXT,
  data_nascimento DATE,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  caixa_id UUID NOT NULL REFERENCES public.caixas_previdencia(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- Folhas de Pagamento
CREATE TABLE public.folhas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_custo TEXT NOT NULL,
  orgao TEXT NOT NULL,
  mes_referencia TEXT NOT NULL,
  vencimento DATE NOT NULL,
  remuneracao NUMERIC(15,2) NOT NULL DEFAULT 0,
  base_calculo NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_servidor NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_patronal NUMERIC(15,2) NOT NULL DEFAULT 0,
  aliquota_servidor NUMERIC(5,2) NOT NULL DEFAULT 11,
  aliquota_patronal NUMERIC(5,2) NOT NULL DEFAULT 22,
  is_13 BOOLEAN NOT NULL DEFAULT false,
  tipo TEXT NOT NULL DEFAULT 'servidor' CHECK (tipo IN ('servidor', 'patronal')),
  paga BOOLEAN NOT NULL DEFAULT false,
  caixa_id UUID NOT NULL REFERENCES public.caixas_previdencia(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.folhas_pagamento ENABLE ROW LEVEL SECURITY;

-- Pagamentos
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_id UUID NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
  valor_pago NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_recebido NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_pagamento TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_caixas_updated_at BEFORE UPDATE ON public.caixas_previdencia FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_folhas_updated_at BEFORE UPDATE ON public.folhas_pagamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Caixas: users can see their own caixa
CREATE POLICY "Users can view their caixa" ON public.caixas_previdencia
  FOR SELECT TO authenticated
  USING (id = public.get_user_caixa_id(auth.uid()));

CREATE POLICY "Admins can manage caixas" ON public.caixas_previdencia
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: users see own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User roles: only viewable by the user themselves
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Funcionários: scoped to caixa
CREATE POLICY "Users can view funcionarios of their caixa" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (caixa_id = public.get_user_caixa_id(auth.uid()));

CREATE POLICY "Admins can manage funcionarios" ON public.funcionarios
  FOR ALL TO authenticated
  USING (caixa_id = public.get_user_caixa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin')));

-- Folhas: scoped to caixa
CREATE POLICY "Users can view folhas of their caixa" ON public.folhas_pagamento
  FOR SELECT TO authenticated
  USING (caixa_id = public.get_user_caixa_id(auth.uid()));

CREATE POLICY "Admins and gestores can manage folhas" ON public.folhas_pagamento
  FOR ALL TO authenticated
  USING (caixa_id = public.get_user_caixa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_financeiro')));

-- Pagamentos: scoped via folha's caixa
CREATE POLICY "Users can view pagamentos of their caixa" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.folhas_pagamento f
    WHERE f.id = folha_id AND f.caixa_id = public.get_user_caixa_id(auth.uid())
  ));

CREATE POLICY "Admins and gestores can manage pagamentos" ON public.pagamentos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.folhas_pagamento f
    WHERE f.id = folha_id AND f.caixa_id = public.get_user_caixa_id(auth.uid())
  ) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_financeiro')));
