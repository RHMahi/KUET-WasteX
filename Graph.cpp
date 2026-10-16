#include "Graph.h"
using namespace std;

void buildCampusGraph(Graph& graph)
{
    graph.addNode("Main Gate");
    graph.addNode("Janata Bank");
    graph.addNode("Pocket Gate");
    graph.addNode("Post Office");
    graph.addNode("Central Field");
    graph.addNode("Academic Area");
    graph.addNode("Administration");
    graph.addNode("Cafeteria");
    graph.addNode("S.S.H");
    graph.addNode("A.E.H");
    graph.addNode("F.A.H");
    graph.addNode("K.A.H");
    graph.addNode("R.H");
    graph.addNode("Guest House");
    graph.addNode("IT Park");

    graph.addEdge("Main Gate","Janata Bank",0.5);
    graph.addEdge("Main Gate","K.A.H",0.2);
    graph.addEdge("Janata Bank","Pocket Gate",0.05);
    graph.addEdge("Janata Bank","Post Office",0.15);
    graph.addEdge("Pocket Gate","Post Office",0.20);
    graph.addEdge("Pocket Gate","Academic Area",0.40);
    graph.addEdge("Post Office","Central Field",0.20);
    graph.addEdge("Post Office","S.S.H",0.15);
    graph.addEdge("Central Field","Academic Area",0.15);
    graph.addEdge("Central Field","S.S.H",0.1);
    graph.addEdge("Central Field","A.E.H",0.15);
    graph.addEdge("Central Field","Cafeteria",0.20);
    graph.addEdge("Academic Area","Administration",0.20);
    graph.addEdge("Academic Area","A.E.H",0.20);
    graph.addEdge("Academic Area","IT Park",0.30);
    graph.addEdge("Administration","K.A.H",0.20);
    graph.addEdge("Administration","R.H",0.25);
    graph.addEdge("Administration","F.A.H",0.30);
    graph.addEdge("Cafeteria","A.E.H",0.2);
    graph.addEdge("S.S.H","A.E.H",0.05);
    graph.addEdge("S.S.H","F.A.H",0.20);
    graph.addEdge("A.E.H","F.A.H",0.15);
    graph.addEdge("F.A.H","R.H",0.20);
    graph.addEdge("K.A.H","Janata Bank",0.25);
    graph.addEdge("K.A.H","R.H",0.15);
    graph.addEdge("R.H","Guest House",0.25);
    graph.addEdge("Guest House","Pocket Gate",0.40);
    graph.addEdge("Guest House","IT Park",0.20);
    graph.addEdge("IT Park","Pocket Gate",0.35);
}