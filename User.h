#ifndef USER_H
#define USER_H

#include<iostream>
#include<string>
#include"UI.h"
using namespace std;

class User{
public:
    string username;
    string password;
    string role;
    string name;
    User()
    {
        username="";
        password="";
        role="";
        name="";
    }
    User(string u,string p,string r,string n)
    {
        username=u;
        password=p;
        role=r;
        name=n;
    }
};

class UserList{
public:
    User users[100];
    int count;
    UserList()
    {
        count=0;
    }
    int findIndex(string username)
    {
        for(int i=0;i<count;i++)
        {
            if(users[i].username==username)
                return i;
        }
        return -1;
    }
    void clear()
    {
        count=0;
    }
    bool addUser(string u,string p,string role,string name)
    {
        if(count>=100)
            return false;
        if(findIndex(u)!=-1)
            return false;
        users[count]=User(u,p,role,name);
        count++;
        return true;
    }
    bool deleteUser(string username)
    {
        int index=findIndex(username);
        if(index==-1)
            return false;
        for(int i=index;i<count-1;i++)
            users[i]=users[i+1];
        count--;
        return true;
    }
    string displayName(string username)
    {
        int index=findIndex(username);
        if(index==-1)
            return username;
        return users[index].name;
    }
    User*authenticate(string u,string p)
    {
        int index=findIndex(u);
        if(index==-1)
            return NULL;
        if(users[index].password!=p)
            return NULL;
        return &users[index];
    }
    void display()
    {
        PrintTitle("REGISTERED USERS");
        if(count==0)
        {
            PrintInfo("No users registered.");
            return ;
        }
        for(int i=0;i<count;i++)
            cout<<i+1<<". "<<users[i].username<<" | "<<users[i].name
                <<" | Role: "<<users[i].role<<endl;
    }
};

#endif