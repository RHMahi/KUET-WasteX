#ifndef QUEUE_H
#define QUEUE_H

#include<iostream>
#include<string>
#include"UI.h"
using namespace std;

class Queue{
public:
    string data[100];
    int frontIndex;
    int rearIndex;
    int count;
    Queue()
    {
        frontIndex=0;
        rearIndex=-1;
        count=0;
    }
    bool isEmpty()
    {
        return count==0;
    }
    bool isFull()
    {
        return count==100;
    }
    void enqueue(string value)
    {
        if(isFull())
        {
            PrintError("Queue is full.");
            return ;
        }
        rearIndex=(rearIndex+1)%100;
        data[rearIndex]=value;
        count++;
    }
    string dequeue()
    {
        if(isEmpty())
            return "";
        string value=data[frontIndex];
        frontIndex=(frontIndex+1)%100;
        count--;
        return value;
    }
    string front()
    {
        if(isEmpty())
            return "";
        return data[frontIndex];
    }
    void display()
    {
        cout<<"Queue (front to rear): ";
        if(isEmpty())
        {
            cout<<"Empty\n";
            return ;
        }
        for(int i=0;i<count;i++)
            cout<<data[(frontIndex+i)%100]<<" ";
        cout<<endl;
    }
};

#endif