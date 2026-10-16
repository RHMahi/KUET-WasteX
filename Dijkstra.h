#ifndef DIJKSTRA_H
#define DIJKSTRA_H

#include<iostream>
#include<string>
#include<vector>
#include"Graph.h"
#include"Stack.h"
using namespace std;

class Dijkstra{
public:
    double dist[100];
    int prev[100];
    Graph*graph;
    Dijkstra()
    {
        graph=NULL;
    }
    void run(Graph& g,string startName)
    {
        graph=&g;
        int n=g.nodeCount();
        for(int i=0;i<n;i++)
        {
            dist[i]=1e9;
            prev[i]=-1;
        }
        int start=g.getIndex(startName);
        if(start==-1)
            return ;
        dist[start]=0;
        bool visited[100];
        for(int i=0;i<n;i++)
            visited[i]=false;
        for(int step=0;step<n;step++)
        {
            int current=-1;
            double best=1e9;
            for(int i=0;i<n;i++)
            {
                if(!visited[i] && dist[i]<best)
                {
                    best=dist[i];
                    current=i;
                }
            }
            if(current==-1)
                break;
            visited[current]=true;
            for(int i=0;i<(int)g.adjList[current].size();i++)
            {
                int next=g.adjList[current][i].destination;
                double weight=g.adjList[current][i].weight;
                if(dist[current]+weight<dist[next])
                {
                    dist[next]=dist[current]+weight;
                    prev[next]=current;
                }
            }
        }
    }
    double getDistance(string name)
    {
        int index=graph->getIndex(name);
        if(index==-1)
            return 1e9;
        return dist[index];
    }
    vector<string> getPath(string destinationName)
    {
        vector<string> path;
        if(graph==NULL)
            return path;
        int dest=graph->getIndex(destinationName);
        if(dest==-1 || dist[dest]>=1e9)
            return path;
        Stack reversePath;
        int at=dest;
        while(at!=-1)
        {
            reversePath.push(graph->getName(at));
            at=prev[at];
        }
        while(!reversePath.isEmpty())
            path.push_back(reversePath.pop());
        return path;
    }
};

#endif