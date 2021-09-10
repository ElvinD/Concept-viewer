import { CollectionViewer, DataSource, SelectionChange } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, Injectable, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GET_Concept, GET_Concepts, GET_ConceptSchemes } from '../model/queries';
import { Query, RDFNode } from '../model/types';


/** Flat node with expandable and level information */
export class DynamicFlatNode {
  constructor(public item: string, public level = 1, public expandable = false,
    public isLoading = false) { }
}

declare global {
  interface Window {
    dataMap: any;
    data: any;
    treeControl: any;
    initialData: any;
  }
}

/**
 * Database for dynamic data. When expanding a node in the tree, the data source will need to fetch
 * the descendants data from the database.
 */
@Injectable({ providedIn: 'root' })
export class DynamicDatabase {
  dataMap = new Map<string, string[]>();

  rootLevelNodes: string[] = [];

  loading: boolean = true;
  error: any;

  private nodeLookupTable = new Map<string, RDFNode>();
  private _selectedNode: string = "";
  selectedNodeSubject = new BehaviorSubject(this._selectedNode);

  constructor(private apollo: Apollo) {
    // debugging only!
    window['dataMap'] = this.dataMap;
  }

  initialData(): DynamicFlatNode[] {
    return this.rootLevelNodes.map(name => new DynamicFlatNode(name, 0, true));
  }

  async loadConcept(uri: string): Promise<RDFNode> {
    return this.apollo.query<Query>({
      query: GET_Concept,
      variables: { uri: uri },
    }).toPromise().then(result => {
      return result.data.concepts[0];
    });
  }

  async loadInitialData(): Promise<string[]> {
    return this.apollo.query<Query>({
      query: GET_ConceptSchemes,
      variables: {},
    }).toPromise().then(result => {
      this.rootLevelNodes = result.data.conceptSchemes.map(conceptScheme => {
        this.nodeLookupTable.set(conceptScheme.uri, conceptScheme);
        const children = conceptScheme.hasTopConcept?.map(skos => {
          this.nodeLookupTable.set(skos.uri, skos);
          return skos;
        });
        if (children) {
          this.dataMap.set(conceptScheme.uri, children.map(child => child.uri));
          children.map((child) => {
            if (child.narrower?.length)
              this.dataMap.set(child.uri, child.narrower.map((nestedChild) => {
                this.nodeLookupTable.set(nestedChild.uri, nestedChild);
                return nestedChild.uri
              }));
          });
        }
        return conceptScheme.uri;
      });
      return this.rootLevelNodes;
    })
  };

  private async loadChildren(uri: string): Promise<string[]> {
    return this.apollo.query<Query>({
      query: GET_Concepts,
      errorPolicy: 'all',
      variables: { filter_broader: uri }
    }).toPromise().then(result => {
      if (result.data.concepts) {
        this.dataMap.set(uri, result.data.concepts.map(skos => {
          return skos.uri;
        }));
        result.data.concepts.map(skos => {
          if (skos.narrower && skos.narrower.length) {
            this.dataMap.set(skos.uri, skos.narrower?.map(skosChild => {
              if (!this.nodeLookupTable.get(skosChild.uri)) {
                this.nodeLookupTable.set(skosChild.uri, skosChild);
              } else {
                // console.log("bevat al skos element: ", skosChild);
              }
              return skosChild.uri;
            }));
          }
        })
        return result.data.concepts.map((skos): string => {
          return skos.uri;
        });
      } else return [];
    })
  }

  getSortedMap(): Map<string, string[]> {
    const keys = Array.from(this.dataMap.keys())
      .sort((a, b) => {
        if (a > b) {
          return 1;
        }
        if (a < b) {
          return -1
        }
        return 0;
      });
    const newMap = new Map<string, string[]>();
    for (const key of keys) {
      if (this.dataMap.get(key)) {
        const value = this.dataMap.get(key);
        newMap.set(key, value ? value : []);
      }
    }
    return newMap;
  }

  getChildren(uri: string): Promise<string[] | undefined> {
    const node = this.nodeLookupTable.get(uri);
    if (node && node.type) {
      switch (node.type[0].label) {
        case "Concept":
          this.loadChildren(uri);
          return new Promise((resolve): void => {
            return resolve(this.loadChildren(uri));
          });
          break;

        case "Concept Scheme":
          // console.log(" clicked a conceptscheme", node);
          break;

        default:
          break;

      }
    }
    return new Promise((resolve): void => {
      return resolve(this.dataMap.get(uri));
    });
  }

  getNode(uri: string): RDFNode | undefined {
    const node = this.nodeLookupTable.get(uri);
    return node;
  }

  async hasChildren(uri: string): Promise<boolean> {
    return this.dataMap.has(uri);
  }

  isExpandable(node: string): boolean {
    return this.dataMap.has(node);
  }
}

export class DynamicDataSource implements DataSource<DynamicFlatNode> {

  dataChange = new BehaviorSubject<DynamicFlatNode[]>([]);
  /** children cache */
  children = new Map<string, string[]>();

  get data(): DynamicFlatNode[] { return this.dataChange.value; }
  set data(value: DynamicFlatNode[]) {
    this._treeControl.dataNodes = value;
    this.dataChange.next(value);
  }

  constructor(private _treeControl: FlatTreeControl<DynamicFlatNode>,
    private _database: DynamicDatabase) {
    window['treeControl'] = this._treeControl;
  }

  connect(collectionViewer: CollectionViewer): Observable<DynamicFlatNode[]> {
    this._treeControl.expansionModel.changed.subscribe(change => {
      if ((change as SelectionChange<DynamicFlatNode>).added ||
        (change as SelectionChange<DynamicFlatNode>).removed) {
        this.handleTreeControl(change as SelectionChange<DynamicFlatNode>);
      }
    });
    return merge(collectionViewer.viewChange, this.dataChange).pipe(map(() => this.data));
  }

  disconnect(collectionViewer: CollectionViewer): void { }

  handleTreeControl(change: SelectionChange<DynamicFlatNode>) {
    if (change.added) {
      change.added.forEach((node) => this.toggleNode(node, true));
    }
    if (change.removed) {
      change.removed.reverse().forEach((node) => this.toggleNode(node, false));
    }
  }

  async toggleNode(node: DynamicFlatNode, expand: boolean) {
    let children: string[] | undefined;
    if (this.children.has(node.item)) {
      children = this.children.get(node.item);
    } else {
      node.isLoading = true;
      children = await this._database.getChildren(node.item);
    }
    if (children) {
      children = this._sortArray(children);
    }
    const index = this.data.indexOf(node);
    if (!children || index < 0) { // If no children, or cannot find the node, no op
      node.isLoading = false;
      return;
    }

    if (expand) {
      const nodesPromises: Promise<DynamicFlatNode>[] = children.map(async item =>
        new DynamicFlatNode(item, node.level + 1, await this._database.hasChildren(item)));
      const nodes = await Promise.all(nodesPromises);
      this.data.splice(index + 1, 0, ...nodes);
      this.children.set(node.item, children);
    } else {
      const count = this.countInvisibleDescendants(node);
      this.data.splice(index + 1, count);
      this.children.delete(node.item);
    }

    this.dataChange.next(this.data);
    node.isLoading = false;
  }

  private _sortArray(array: string[]): string[] {
    const sorted = array.sort((a, b) => {
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }

      return 0;
    });
    return sorted;
  }

  countInvisibleDescendants(node: DynamicFlatNode): number {
    let count = 0;
    if (!this._treeControl.isExpanded(node)) {
      this._treeControl.getDescendants(node).map(child => {
        count += 1 + this.countInvisibleDescendants(child);
      });
    }
    return count;
  }
}

@Component({
  selector: 'app-conceptlist',
  templateUrl: './conceptlist.component.html',
  styleUrls: ['./conceptlist.component.css']
})
export class ConceptlistComponent implements OnInit {

  constructor(public database: DynamicDatabase, private router:Router) {
    this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new DynamicDataSource(this.treeControl, database);
  }

  treeControl: FlatTreeControl<DynamicFlatNode>;
  dataSource: DynamicDataSource;

  nodeClicked(event: DynamicFlatNode) {
    const concept = this.database.getNode(event.item);
    if (concept == undefined) return;
    const conceptName = concept.uri.match(/\/([^\/]+)[\/]?$/)?.pop();
    const domainURI = concept.uri.match(/(http:|https:)\/\/(www\.)?(\w|\d)+.+?\//ig)?.pop();
    let conceptURI = "";
    if (domainURI !== undefined) {
      conceptURI = concept.uri.replace(domainURI, "");
    }
    // console.log("strippedURI:", conceptURI);
    this.router.navigateByUrl('/' + conceptURI);
    this.database.selectedNodeSubject.next(event.item);
  }

  getLevel = (node: DynamicFlatNode) => {
    return node.level;
  };

  isExpandable = (node: DynamicFlatNode): boolean => {
    return node.expandable;
  };

  hasChild = (_: number, _nodeData: DynamicFlatNode) => {
    return _nodeData.expandable;
  };

  ngOnInit(): void {
    this.database.loadInitialData().then(() => {
      this.dataSource.data = this.database.initialData();
      if (this.dataSource.data.length) {
        this.database.selectedNodeSubject.next(this.dataSource.data[0].item);
        this.treeControl.expand(this.treeControl.dataNodes[0]);
      }
    });
  }
}
