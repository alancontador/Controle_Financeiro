export const CARD_CATEGORIES = [
  'Alimentação', 'Supermercado', 'Farmácia', 'Combustível', 'Vestuário',
  'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Outros',
];

export function autoCategory(desc: string): string {
  const d = desc.toUpperCase();
  if (d.includes('SUPERMERCADO') || d.includes('SUPERMERC')) return 'Supermercado';
  if (d.includes('FARMACIA') || d.includes('DROGARIA') || d.includes('DROGA')) return 'Farmácia';
  if (d.includes('POSTO') || d.includes('SHELL') || d.includes('IPIRANGA') || d.includes('COMBUSTI')) return 'Combustível';
  if (d.includes('UBER') || d.includes('99') || d.includes('CABIFY')) return 'Transporte';
  if (d.includes('NETFLIX') || d.includes('SPOTIFY') || d.includes('DISNEY') || d.includes('AMAZON PRIME') || d.includes('HBO')) return 'Assinaturas';
  if (d.includes('RESTAUR') || d.includes('LANCHON') || d.includes('PADARIA') || d.includes('IFOOD') || d.includes('RAPPI')) return 'Alimentação';
  if (d.includes('SAUDE') || d.includes('HOSPITAL') || d.includes('CLINICA') || d.includes('MEDIC')) return 'Saúde';
  return 'Outros';
}
