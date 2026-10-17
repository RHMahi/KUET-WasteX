#ifndef STACK_H
#define STACK_H

#include<iostream>
#include<string>
#include"UI.h"
using namespace std;

class Stack{
public:
    string data[100];
    int topIndex;
    Stack()
    {
        topIndex=-1;
    }
    bool isEmpty()
    {
        return topIndex==-1;
    }
    bool isFull()
    {
        return topIndex==99;
    }
    void push(string value)
    {
        if(isFull())
        {
            PrintError("Stack is full.");
            return ;
        }
        topIndex++;
        data[topIndex]=value;
    }
    string pop()
    {
        if(isEmpty())
            return "";
        string value=data[topIndex];
        topIndex--;
        return value;
    }
    string top()
    {
        if(isEmpty())
            return "";
        return data[topIndex];
    }
    void display()
    {
        cout<<"Stack (top to bottom): ";
        if(isEmpty())
        {
            cout<<"Empty\n";
            return ;
        }
        for(int i=topIndex;i>=0;i--)
            cout<<data[i]<<" ";
        cout<<endl;
    }
};

#endif