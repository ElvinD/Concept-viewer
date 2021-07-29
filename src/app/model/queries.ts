import { gql } from 'apollo-angular';

export const GET_Concept = gql`
 query getSearchResults($uri: ID) {
            concepts(uri:$uri) {
                  uri
                  
                  label
                  definition {
                        string
                  }
                  type {
                        uri
                        label
                  }
                  broader {
                        uri
                        type {
                              uri
                              label
                        }
                        label
                  }
                  narrower {
                        uri
                        label
                        type {
                              uri
                              label
                        }
                        narrower {
                              uri
                              label
                              type {
                                    uri
                                    label
                              }
                        }
                  }
            }
      }
`;
export const GET_ConceptSchemes = gql`
      query getSearchResults($limit: Int) {
            conceptSchemes(first: $limit) {
                  uri
                  label
                  type {
                        uri
                        label
                  }
                  rdfs_label {
                        string
                        datatype
                        lang
                  }
                  hasTopConcept {
                        uri
                        label
                        type {
                              uri
                              label
                        }
                        narrower {
                              uri
                              label
                              type {
                                    uri
                                    label
                              }
                              
                        }
                  }
                  subject {
                        uri
                        label
                  }
            }
      }
`;

export const GET_Concepts = gql`
      query getSearchResults($limit: Int, $filter_broader: ID) {
            concepts(first: $limit, where: {broader: {hasValue: $filter_broader}}) {
                  uri
                  label
                  type {
                        uri
                        label
                  }
                  broader {
                        uri
                        type {
                              uri
                              label
                        }
                        label
                  }
                  narrower {
                        uri
                        label
                        type {
                              uri
                              label
                        }
                        narrower {
                              uri
                              label
                              type {
                                    uri
                                    label
                              }
                        }
                  }
            }
      }
`;