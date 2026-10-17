#include "LinkedList.h"
using namespace std;

void HistoryList::addRecord(string binId,string location,string description)
{
    HistoryNode*newnode=new HistoryNode(binId,location,description);
    if(head==NULL)
        head=newnode;
    else
    {
        newnode->next=head;
        head=newnode;
    }
    count++;
}

void HistoryList::display()
{
    PrintTitle("COLLECTION HISTORY");
    if(head==NULL)
    {
        PrintInfo("No collection records yet.");
        return ;
    }
    HistoryNode*temp=head;
    while(temp!=NULL)
    {
        cout<<"Bin "<<temp->binId<<" | Location: "<<temp->location
            <<" | "<<temp->description<<endl;
        temp=temp->next;
    }
}

bool HistoryList::searchRecord(string binId)
{
    HistoryNode*temp=head;
    while(temp!=NULL)
    {
        if(temp->binId==binId)
        {
            PrintSuccess("Record Found: Bin "+temp->binId+" | Location: "+temp->location+" | "+temp->description);
            return true;
        }
        temp=temp->next;
    }
    PrintError("No record found for bin "+binId);
    return false;
}

bool HistoryList::deleteRecord(string binId)
{
    if(head==NULL)
        return false;
    if(head->binId==binId)
    {
        HistoryNode*temp=head;
        head=head->next;
        delete temp;
        count--;
        return true;
    }
    HistoryNode*temp=head;
    while(temp->next!=NULL && temp->next->binId!=binId)
        temp=temp->next;
    if(temp->next==NULL)
        return false;
    HistoryNode*todelete=temp->next;
    temp->next=todelete->next;
    delete todelete;
    count--;
    return true;
}

void HistoryList::clear()
{
    HistoryNode*temp=head;
    while(temp!=NULL)
    {
        HistoryNode*nextnode=temp->next;
        delete temp;
        temp=nextnode;
    }
    head=NULL;
    count=0;
}