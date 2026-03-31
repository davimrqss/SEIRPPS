export interface Folha {
  id: string;
  centroCusto: string;
  orgao: string;
  mesReferencia: string;
  vencimento: string;
  remuneracao: number;
  baseCalculo: number;
  valorServidor: number;
  valorPatronal: number;
  aliquotaServidor: number;
  aliquotaPatronal: number;
  is13: boolean;
  paga: boolean;
  valorPago: number;
  valorRecebido: number;
  tipo: "servidor" | "patronal";
}

export interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  orgao: string;
  cargo: string;
  dataNascimento: string;
  email: string;
  status: "ativo" | "inativo";
}

export const mockFolhas: Folha[] = [
  {
    id: "1",
    centroCusto: "Secretaria de Educação",
    orgao: "Prefeitura Municipal",
    mesReferencia: "2026-01",
    vencimento: "2026-01-20",
    remuneracao: 125000,
    baseCalculo: 112500,
    valorServidor: 12375,
    valorPatronal: 24750,
    aliquotaServidor: 11,
    aliquotaPatronal: 22,
    is13: false,
    paga: true,
    valorPago: 37125,
    valorRecebido: 37125,
    tipo: "servidor",
  },
  {
    id: "2",
    centroCusto: "Secretaria de Saúde",
    orgao: "Prefeitura Municipal",
    mesReferencia: "2026-01",
    vencimento: "2026-01-20",
    remuneracao: 98000,
    baseCalculo: 88200,
    valorServidor: 9702,
    valorPatronal: 19404,
    aliquotaServidor: 11,
    aliquotaPatronal: 22,
    is13: false,
    paga: false,
    valorPago: 0,
    valorRecebido: 0,
    tipo: "servidor",
  },
  {
    id: "3",
    centroCusto: "Secretaria de Educação",
    orgao: "Prefeitura Municipal",
    mesReferencia: "2026-02",
    vencimento: "2026-02-20",
    remuneracao: 125000,
    baseCalculo: 112500,
    valorServidor: 12375,
    valorPatronal: 24750,
    aliquotaServidor: 11,
    aliquotaPatronal: 22,
    is13: false,
    paga: false,
    valorPago: 9000,
    valorRecebido: 9000,
    tipo: "patronal",
  },
  {
    id: "4",
    centroCusto: "Câmara Municipal",
    orgao: "Câmara Municipal",
    mesReferencia: "2026-01",
    vencimento: "2026-01-20",
    remuneracao: 65000,
    baseCalculo: 58500,
    valorServidor: 6435,
    valorPatronal: 12870,
    aliquotaServidor: 11,
    aliquotaPatronal: 22,
    is13: false,
    paga: true,
    valorPago: 19305,
    valorRecebido: 19305,
    tipo: "servidor",
  },
  {
    id: "5",
    centroCusto: "Secretaria de Educação",
    orgao: "Prefeitura Municipal",
    mesReferencia: "2025-12",
    vencimento: "2025-12-20",
    remuneracao: 125000,
    baseCalculo: 112500,
    valorServidor: 12375,
    valorPatronal: 24750,
    aliquotaServidor: 11,
    aliquotaPatronal: 22,
    is13: true,
    paga: true,
    valorPago: 37125,
    valorRecebido: 37125,
    tipo: "servidor",
  },
];

export const mockFuncionarios: Funcionario[] = [
  {
    id: "1",
    nome: "Maria Oliveira Santos",
    cpf: "123.456.789-00",
    orgao: "Prefeitura Municipal",
    cargo: "Administradora",
    dataNascimento: "1985-03-15",
    email: "maria@previdencia.gov",
    status: "ativo",
  },
  {
    id: "2",
    nome: "João Carlos Silva",
    cpf: "987.654.321-00",
    orgao: "Prefeitura Municipal",
    cargo: "Gestor Financeiro",
    dataNascimento: "1978-07-22",
    email: "joao@previdencia.gov",
    status: "ativo",
  },
  {
    id: "3",
    nome: "Ana Paula Costa",
    cpf: "456.789.123-00",
    orgao: "Câmara Municipal",
    cargo: "Analista",
    dataNascimento: "1990-11-08",
    email: "ana@previdencia.gov",
    status: "inativo",
  },
];
