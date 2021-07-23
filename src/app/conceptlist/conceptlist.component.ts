import { Component, Injectable, OnInit } from '@angular/core';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { CollectionViewer, DataSource, SelectionChange } from '@angular/cdk/collections';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConceptSchemeNode, SkosNode } from '../list-resources/list-resources.component';
import { Apollo } from 'apollo-angular';
import { GET_Concepts, GET_ConceptSchemes, Query } from '../services/graphql.service';

export interface RDFNode {
  label: string;
  uri?: string;
  parentUri?: string;
  children?: RDFNode[];
}

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

  constructor() { }

  /** Initial data from database */
  initialData(): DynamicFlatNode[] {
    return this.rootLevelNodes.map(name => new DynamicFlatNode(name, 0, true));
  }

  getChildren(node: string): string[] | undefined {
    return this.dataMap.get(node);
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
  allSkosConcepts$!: Observable<SkosNode[]>;

  get data(): DynamicFlatNode[] { return this.dataChange.value; }
  set data(value: DynamicFlatNode[]) {
    this._treeControl.dataNodes = value;
    this.dataChange.next(value);
  }

  constructor(private _treeControl: FlatTreeControl<DynamicFlatNode>,
    private _database: DynamicDatabase, private apollo: Apollo) { }

  connect(collectionViewer: CollectionViewer): Observable<DynamicFlatNode[]> {
    this._treeControl.expansionModel.changed.subscribe(change => {
      if ((change as SelectionChange<DynamicFlatNode>).added ||
        (change as SelectionChange<DynamicFlatNode>).removed) {
        this.handleTreeControl(change as SelectionChange<DynamicFlatNode>);
      }
    });

    return merge(collectionViewer.viewChange, this.dataChange).pipe(map(() => {
      // console.log("return data: ", this.data);
      return this.data;
    }));
  }

  disconnect(collectionViewer: CollectionViewer): void { }

  /** Handle expand/collapse behaviors */
  handleTreeControl(change: SelectionChange<DynamicFlatNode>) {
    if (change.added) {
      change.added.forEach(node => {
        return this.toggleNode(node, true);
      });
    }
    if (change.removed) {
      change.removed.slice().reverse().forEach((node): void => this.toggleNode(node, false));
    }
  }

  /**
   * Toggle the node, remove from display list
   */
  toggleNode(node: DynamicFlatNode, expand: boolean) {
    const children = this._database.getChildren(node.item);
    const index = this.data.indexOf(node);
    if (!children || index < 0) { // If no children, or cannot find the node, no op
      return;
    }

    node.isLoading = true;

    // console.log ("toggle node: ", node, "children: ", children);
    // for every child we must query for more children we didnt already cache during initial load

    // load new children
    if (expand) {
      this.getSkosChildren(children);
    }

    // update _database


    //remove set timeout
    setTimeout(() => {
      if (expand) {
        const nodes = children.map((name): DynamicFlatNode => {
          return new DynamicFlatNode(name, node.level + 1, this._database.isExpandable(name));
        });
        this.data.splice(index + 1, 0, ...nodes);
      } else {
        let count = 0;
        for (let i = index + 1; i < this.data.length && this.data[i].level > node.level; i++, count++) { }
        this.data.splice(index + 1, count);
      }

      // notify the change
      this.dataChange.next(this.data);
      node.isLoading = false;
    }, 1000);
  }

  getSkosChildren(children: string[]) {
    console.log("op zoek naar kinderen: ", children);
    const queue = children.concat();
    const child = queue.splice(0, 1).pop();
    console.log("nu kijken naar", child);
    if (child) {
      if (this._database.getChildren(child)?.length) {
        // console.log(child, " heeft kinderen dan hoef ik niet te zoeken", children);
        if (queue.length) {
          console.log("verder kijken: ", queue);
          this.getSkosChildren(queue);
        } else {
          console.log("Niets te zien hier");
        }
      }
    }
    this.allSkosConcepts$ = this.apollo.watchQuery<Query>({
      query: GET_Concepts,
      errorPolicy: 'all',
      variables: { filter_broader: child },
    }).valueChanges.pipe(map(result => {
      // console.log("Gevonden:", result);
      return result.data.concepts;
    }));
    this.allSkosConcepts$.subscribe((data): void => {
      // console.log("children data: ", data);
      if (data.length) {
        console.log("kindern gevonden: ", data);
        if (data.length > 0 && data[0].broader?.length) {
          this._database.dataMap.set(data[0].broader[0].uri, data.map(child => child.uri));
        }
      }
      if (queue.length) {
        this.getSkosChildren(queue);
      } else {
        console.log("done loading all children");
      }
    });
  }
}

@Component({
  selector: 'app-conceptlist',
  templateUrl: './conceptlist.component.html',
  styleUrls: ['./conceptlist.component.css']
})
export class ConceptlistComponent implements OnInit {

  rootLevelConceptSchemes$!: Observable<ConceptSchemeNode[]>;

  constructor(public database: DynamicDatabase, private readonly apollo: Apollo) {
    this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new DynamicDataSource(this.treeControl, database, apollo);

    this.dataSource.data = database.initialData();
  }

  treeControl: FlatTreeControl<DynamicFlatNode>;

  dataSource: DynamicDataSource;

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
    this.rootLevelConceptSchemes$ = this.apollo.watchQuery<Query>({
      query: GET_ConceptSchemes,
      variables: {},
    }).valueChanges.pipe(map(result => result.data.conceptSchemes));

    this.rootLevelConceptSchemes$.subscribe((data): void => {
      this.database.rootLevelNodes = data.map(conceptScheme => {
        const children = conceptScheme.hasTopConcept?.map(skos => {
          return skos;
        });
        if (children) {
          this.database.dataMap.set(conceptScheme.uri, children.map(child => child.uri));
          children.map((child) => {
            // console.log("iteraring children: ", child);
            if (child.narrower?.length)
              this.database.dataMap.set(child.uri, child.narrower.map(nestedChild => nestedChild.uri));
          });
        }
        return conceptScheme.uri;
      });
      this.dataSource.data = this.database.initialData();
      // console.log(this.database.dataMap);
    });
  }
}
