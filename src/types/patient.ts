export interface PatientSample {
  id: string;
  geneA_expression: number;
  geneB_expression: number;
  mutation_status: 'MUTANT' | 'WILDTYPE' | 'NORMAL';
  subtype: string;
  cancer_type: string;
  age: number;
  stage: string;
  gtex_reference: number;
}
