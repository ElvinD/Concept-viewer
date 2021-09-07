import { gql } from 'apollo-angular';

export const GET_Concept = gql`
      query getSearchResults($uri: ID) {
            concepts(uri:$uri) {
                  uri
                  label
                  definition {
                        string
                        lang
                  }
                  type {
                        uri
                        label
                  }
                  altLabel {
                        string
                        lang
                  }
                  prefLabel {
                        string
                        lang
                  }
                  related {
                        uri
                        label
                  }
                  note {
                        string
                        datatype
                        lang
                  }
                  scopeNote {
                        string
                        datatype
                        lang
                  }
                  example {
                        string
                        datatype
                        lang
                  }
                  source
                  subject {
                        uri
                        label
                  }
                  editorialNote {
                        string
                        lang
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
                        
                  }
            }
      }
`;
export const GET_ConceptSchemes = gql`
      query getSearchResults($limit: Int) {
            conceptSchemes(first: $limit) {
                  aantalBegrippen
                  uri
                  label
                  comment {
                        string
                        datatype
                        lang
                  }
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
                        # narrower {
                              #       uri
                              #       label
                              #       type {
                                    #             uri
                                    #             label
                                    #       }
                                    # }
                              }
                        }
                  }
`;