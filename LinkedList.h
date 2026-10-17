#ifndef LINKEDLIST_H
#define LINKEDLIST_H

#include<iostream>
#include<string>
#include"UI.h"
using namespace std;

class HistoryNode{
public:
    string binId;
    string location;
    string description;
    HistoryNode*next;
    HistoryNode(string b,string loc,string d)
    {
        binId=b;
        location=loc;
        description=d;
        next=NULL;
    }
};

class HistoryList{
public:
    HistoryNode*head;
    int count;
    HistoryList()
    {
        head=NULL;
        count=0;
    }
    void addRecord(string binId,string location,string description);
    void display();
    bool searchRecord(string binId);
    bool deleteRecord(string binId);
    void clear();
};

#endif