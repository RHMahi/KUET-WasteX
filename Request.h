#ifndef REQUEST_H
#define REQUEST_H

#include<iostream>
#include<string>
#include<cctype>
#include"UI.h"
using namespace std;

class Request{
public:
    string requestId;
    string binId;
    string location;
    string priority;
    string status;
    string requestedBy;
    string assignedDriver;
    Request()
    {
        requestId="";
        binId="";
        location="";
        priority="";
        status="Pending";
        requestedBy="";
        assignedDriver="";
    }
    string upperText(string text)
    {
        for(int i=0;i<(int)text.size();i++)
            text[i]=toupper(text[i]);
        return text;
    }
    void display()
    {
        cout<<"Request ID       : "<<requestId<<endl;
        cout<<"Bin ID           : "<<binId<<endl;
        cout<<"Location         : "<<location<<endl;
        cout<<"Priority         : "<<priority<<endl;
        cout<<"Requested By     : "<<requestedBy<<endl;
        cout<<"Assigned Driver  : "<<(assignedDriver==""?"Not Assigned":assignedDriver)<<endl;
        cout<<"Status           : "<<upperText(status)<<endl;
        cout<<"\n";
    }
};

class RequestNode{
public:
    Request data;
    RequestNode*next;
    RequestNode(Request r)
    {
        data=r;
        next=NULL;
    }
};

class RequestList{
public:
    RequestNode*head;
    int count;
    int nextId;
    RequestList()
    {
        head=NULL;
        count=0;
        nextId=101;
    }
    string generateId()
    {
        string id="R"+to_string(nextId);
        nextId++;
        return id;
    }
    void clear()
    {
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            RequestNode*nextnode=temp->next;
            delete temp;
            temp=nextnode;
        }
        head=NULL;
        count=0;
    }
    void addRequest(Request r)
    {
        RequestNode*newnode=new RequestNode(r);
        if(head==NULL)
            head=newnode;
        else
        {
            RequestNode*temp=head;
            while(temp->next!=NULL)
                temp=temp->next;
            temp->next=newnode;
        }
        count++;
    }
    Request*find(string requestId)
    {
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            if(temp->data.requestId==requestId)
                return &(temp->data);
            temp=temp->next;
        }
        return NULL;
    }
    Request*findByBin(string binId)
    {
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            if(temp->data.binId==binId)
                return &(temp->data);
            temp=temp->next;
        }
        return NULL;
    }
    bool cancelRequest(string requestId)
    {
        Request*r=find(requestId);
        if(r==NULL)
            return false;
        r->status="Cancelled";
        return true;
    }
    bool assignDriver(string requestId,string driver)
    {
        Request*r=find(requestId);
        if(r==NULL)
            return false;
        r->assignedDriver=driver;
        r->status="Assigned";
        return true;
    }
    bool completeByBin(string binId)
    {
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            if(temp->data.binId==binId &&
               (temp->data.status=="Pending" || temp->data.status=="Assigned"))
            {
                temp->data.status="Completed";
                return true;
            }
            temp=temp->next;
        }
        return false;
    }
    int countByStatus(string status)
    {
        int total=0;
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            if(temp->data.status==status)
                total++;
            temp=temp->next;
        }
        return total;
    }
    void displayAll()
    {
        PrintTitle("COLLECTION REQUESTS");
        if(head==NULL)
        {
            PrintInfo("No requests yet.");
            return ;
        }
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            temp->data.display();
            temp=temp->next;
        }
    }
    void displayByUser(string username)
    {
        PrintTitle("MY REQUESTS");
        int total=0;
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            if(temp->data.requestedBy==username)
            {
                temp->data.display();
                total++;
            }
            temp=temp->next;
        }
        if(total==0)
            PrintInfo("You have no requests.");
    }
    void displayByDriver(string driver)
    {
        PrintTitle("ASSIGNED REQUESTS");
        int total=0;
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            if(temp->data.assignedDriver==driver &&
               (temp->data.status=="Assigned" || temp->data.status=="Pending"))
            {
                temp->data.display();
                total++;
            }
            temp=temp->next;
        }
        if(total==0)
            PrintInfo("No requests assigned to you.");
    }
    void displayActive()
    {
        int total=0;
        RequestNode*temp=head;
        while(temp!=NULL)
        {
            if(temp->data.status=="Pending" || temp->data.status=="Assigned")
            {
                temp->data.display();
                total++;
            }
            temp=temp->next;
        }
        if(total==0)
            PrintInfo("No active requests.");
    }
};

#endif