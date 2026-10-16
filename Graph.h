#ifndef GRAPH_H
#define GRAPH_H

#include<iostream>
#include<string>
#include<vector>
#include<queue>
#include<stack>
#include"UI.h"
using namespace std;

class Edge{
public:
    int destination;
    double weight;
    Edge(int d,double w)
    {
        destination=d;
        weight=w;
    }
};

class Graph{
public:
    vector<string> nodeNames;
    vector<vector<Edge>> adjList;
    Graph()
    {
    }
    int getIndex(string name)
    {
        for(int i=0;i<(int)nodeNames.size();i++)
        {
            if(nodeNames[i]==name)
                return i;
        }
        return -1;
    }
    string getName(int index)
    {
        if(index<0 || index>=(int)nodeNames.size())
            return "";
        return nodeNames[index];
    }
    int nodeCount()
    {
        return (int)nodeNames.size();
    }
    int edgeCount()
    {
        int total=0;
        for(int i=0;i<(int)adjList.size();i++)
            total+=(int)adjList[i].size();
        return total/2;
    }
    double getEdgeWeight(string from,string to)
    {
        int u=getIndex(from);
        int v=getIndex(to);
        if(u==-1 || v==-1)
            return -1;
        for(int i=0;i<(int)adjList[u].size();i++)
        {
            if(adjList[u][i].destination==v)
                return adjList[u][i].weight;
        }
        return -1;
    }
    int addNode(string name)
    {
        int existing=getIndex(name);
        if(existing!=-1)
            return existing;
        int newIndex=nodeNames.size();
        nodeNames.push_back(name);
        adjList.push_back(vector<Edge>());
        return newIndex;
    }
    void addEdge(string from,string to,double weight)
    {
        int u=getIndex(from);
        int v=getIndex(to);
        if(u==-1 || v==-1)
        {
            PrintError("Location not found for road "+from+" - "+to);
            return ;
        }
        if(u==v)
        {
            PrintError("A location cannot connect to itself.");
            return ;
        }
        for(int i=0;i<(int)adjList[u].size();i++)
        {
            if(adjList[u][i].destination==v)
            {
                PrintError("Road already exists between "+from+" and "+to+".");
                return ;
            }
        }
        adjList[u].push_back(Edge(v,weight));
        adjList[v].push_back(Edge(u,weight));
    }
    void clearEdges()
    {
        for(int i=0;i<(int)adjList.size();i++)
            adjList[i].clear();
    }
    void display()
    {
        PrintTitle("CAMPUS ROAD NETWORK");
        for(int i=0;i<(int)nodeNames.size();i++)
        {
            cout<<nodeNames[i]<<" -> ";
            for(int j=0;j<(int)adjList[i].size();j++)
                cout<<nodeNames[adjList[i][j].destination]<<"["<<adjList[i][j].weight<<" km], ";
            cout<<endl;
        }
    }
    void bfs(string startName)
    {
        int start=getIndex(startName);
        if(start==-1)
        {
            PrintError("Start location not found.");
            return ;
        }
        vector<bool> visited(nodeNames.size(),false);
        queue<int> q;
        visited[start]=true;
        q.push(start);
        cout<<"Visit Order (level by level): ";
        bool first=true;
        while(!q.empty())
        {
            int current=q.front();
            q.pop();
            if(!first)
                cout<<" -> ";
            cout<<nodeNames[current];
            first=false;
            for(int i=0;i<(int)adjList[current].size();i++)
            {
                int next=adjList[current][i].destination;
                if(!visited[next])
                {
                    visited[next]=true;
                    q.push(next);
                }
            }
        }
        cout<<endl;
    }
    void dfs(string startName)
    {
        int start=getIndex(startName);
        if(start==-1)
        {
            PrintError("Start location not found.");
            return ;
        }
        vector<bool> visited(nodeNames.size(),false);
        stack<int> s;
        s.push(start);
        cout<<"Visit Order (depth first): ";
        bool first=true;
        while(!s.empty())
        {
            int current=s.top();
            s.pop();
            if(visited[current])
                continue;
            visited[current]=true;
            if(!first)
                cout<<" -> ";
            cout<<nodeNames[current];
            first=false;
            for(int i=0;i<(int)adjList[current].size();i++)
            {
                int next=adjList[current][i].destination;
                if(!visited[next])
                    s.push(next);
            }
        }
        cout<<endl;
    }
};

void buildCampusGraph(Graph& graph);

#endif