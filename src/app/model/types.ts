export interface RDFNode {
  label: string;
  type: RDFNode[];
  uri: string;
  parentUri?: string;
  children?: RDFNode[];
}

export interface SkosNode extends RDFNode {
  narrower?: SkosNode[];
  broader?: SkosNode[];
  topConceptOf?: ConceptSchemeNode[];
}

export interface ConceptSchemeNode extends RDFNode {
  hasTopConcept?: SkosNode[];
}

export interface TreeRenderNode {
  expandable: boolean;
  name: string;
  level: number;
}


export type Query = {
  conceptSchemes: ConceptSchemeNode[];
  concepts: SkosNode[];
}