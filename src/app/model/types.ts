export interface RDFNode {
  label: string;
  type: RDFNode[];
  uri: string;
  parentUri?: string;
  children?: RDFNode[];
  comment?:Literal[];
  __typename?: string;
}

export interface Literal {
  string: string;
  lang:string;
}

export interface ConceptNode extends RDFNode {
  narrower?: ConceptNode[];
  broader?: ConceptNode[];
  related?: ConceptNode[];
  definition?: Literal[];
  prefLabel?:Literal[];
  altLabel?: Literal[];
  note?:Literal[];
  scopeNote?:Literal[];
  example?:Literal[];
  source?:string[];
  subject?:RDFNode[];
  editorialNote?: Literal[];
  topConceptOf?: ConceptSchemeNode[];
}

export interface ConceptSchemeNode extends RDFNode {
  hasTopConcept?: ConceptNode[];
  aantalBegrippen:number;
}

export interface TreeRenderNode {
  expandable: boolean;
  name: string;
  level: number;
}


export type Query = {
  conceptSchemes: ConceptSchemeNode[];
  concepts: ConceptNode[];
}