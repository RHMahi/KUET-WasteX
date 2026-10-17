#ifndef PRIORITYQUEUE_H
#define PRIORITYQUEUE_H

#include<iostream>
#include<iomanip>
#include<cstdio>
#include"Bin.h"
#include"UI.h"
using namespace std;

class PriorityQueue{
public:
    Bin data[100];
    int count;
    PriorityQueue()
    {
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
    void swapBin(int i,int j)
    {
        Bin temp=data[i];
        data[i]=data[j];
        data[j]=temp;
    }
    void push(Bin b)
    {
        if(isFull())
        {
            PrintError("Priority queue is full.");
            return ;
        }
        data[count]=b;
        int i=count;
        count++;
        while(i>0)
        {
            int parent=(i-1)/2;
            if(data[parent].priority<data[i].priority)
            {
                swapBin(parent,i);
                i=parent;
            }
            else
                break;
        }
    }
    Bin pop()
    {
        if(isEmpty())
            return Bin();
        Bin top=data[0];
        count--;
        data[0]=data[count];
        int i=0;
        while(1)
        {
            int left=2*i+1;
            int right=2*i+2;
            int largest=i;
            if(left<count && data[left].priority>data[largest].priority)
                largest=left;
            if(right<count && data[right].priority>data[largest].priority)
                largest=right;
            if(largest==i)
                break;
            swapBin(i,largest);
            i=largest;
        }
        return top;
    }
    Bin top()
    {
        if(isEmpty())
            return Bin();
        return data[0];
    }
    void display()
    {
        cout<<"Current Priority Queue: ";
        if(isEmpty())
        {
            cout<<"Empty\n";
            return ;
        }
        for(int i=0;i<count;i++)
        {
            char buffer[50];
            sprintf(buffer,"%.0f",data[i].fill);
            cout<<"("<<data[i].id<<","<<buffer<<") ";
        }
        cout<<endl;
    }
    void displayTable()
    {
        PriorityQueue copy;
        for(int i=0;i<count;i++)
            copy.data[copy.count++]=data[i];
        PrintTitle("PROPOSED COLLECTION PRIORITY");
        cout<<left<<setw(4)<<"#"<<setw(6)<<"BIN"<<setw(18)<<"LOCATION"
            <<setw(9)<<"FILL"<<right<<setw(9)<<"PRIORITY"<<endl;
        int rank=1;
        char buffer[50];
        while(!copy.isEmpty())
        {
            Bin b=copy.pop();
            sprintf(buffer,"%.1f",b.priority);
            int filled=(int)b.fill;
            cout<<left<<setw(4)<<rank<<setw(6)<<b.id<<setw(18)<<b.location
                <<setw(9)<<(to_string(filled)+"%")<<right<<setw(9)<<buffer<<endl;
            rank++;
        }
        if(!isEmpty())
            cout<<"\n"<<ARROW<<" Next collection: "<<top().id<<endl;
    }
};

#endif