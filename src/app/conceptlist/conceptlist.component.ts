import { CollectionViewer, DataSource, SelectionChange } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, Injectable, OnInit } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GET_Concepts, GET_ConceptSchemes } from '../model/queries';
import { RDFNode, Query } from '../model/types';


/** Flat node with expandable and level information */
export class DynamicFlatNode {
  constructor(public item: string, public level = 1, public expandable = false,
    public isLoading = false) { }
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

  constructor(private apollo: Apollo) { }

  /** Initial data from database */
  initialData(): DynamicFlatNode[] {
    return this.rootLevelNodes.map(name => new DynamicFlatNode(name, 0, true));
  }

  async loadInitialData(): Promise<string[]> {
    return this.apollo.query<Query>({
      query: GET_ConceptSchemes,
      variables: {},
    }).toPromise().then(result => {
      this.rootLevelNodes = result.data.conceptSchemes.map(conceptScheme => {
        this.nodeLookupTable.set(conceptScheme.uri, { uri: conceptScheme.uri, type: conceptScheme.type, label: conceptScheme.label });
        const children = conceptScheme.hasTopConcept?.map(skos => {
          this.nodeLookupTable.set(skos.uri, { uri: skos.uri, type: skos.type, label: skos.label });
          return skos;
        });
        if (children) {
          this.dataMap.set(conceptScheme.uri, children.map(child => child.uri));
          children.map((child) => {
            //       // console.log("iteraring children: ", child);
            if (child.narrower?.length)
              this.dataMap.set(child.uri, child.narrower.map((nestedChild) => {
                this.nodeLookupTable.set(nestedChild.uri, { uri: nestedChild.uri, type: nestedChild.type, label: nestedChild.label });
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
    // console.log("get children from :", uri);
    return this.apollo.query<Query>({
      query: GET_Concepts,
      errorPolicy: 'all',
      variables: { filter_broader: uri }
    }).toPromise().then(result => {
      // console.log("loaded children:", result.data);
      if (result.data.concepts) {
        this.dataMap.set(uri, result.data.concepts.map(skos => {
          return skos.uri;
        }));
        result.data.concepts.map(skos => {
          if (skos.narrower && skos.narrower.length) {
            this.dataMap.set(skos.uri, skos.narrower?.map(skosChild => {
              if (!this.nodeLookupTable.get(skosChild.uri)) {
                this.nodeLookupTable.set(skosChild.uri, { uri: skosChild.uri, type: skosChild.type, label: skosChild.label });
              } else {
                console.log("bevat al skos element: ", skosChild);
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
          console.log(" clicked a conceptscheme", node);
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
/**
 * File database, it can build a tree structured Json object from string.
 * Each node in Json object represents a file or a directory. For a file, it has filename and type.
 * For a directory, it has filename and children (a list of files or directories).
 * The input will be a json object string, and the output is a list of `FileNode` with nested
 * structure.
 */
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
    private _database: DynamicDatabase) { }

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

  constructor(public database: DynamicDatabase) {
    this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new DynamicDataSource(this.treeControl, database);
  }

  treeControl: FlatTreeControl<DynamicFlatNode>;
  dataSource: DynamicDataSource;

  nodeClicked(event:any) {
    console.log("clicked:", event);
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
    });
  }
}
