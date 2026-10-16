#ifndef BIN_H
#define BIN_H

#include<iostream>
#include<string>
#include<cstdio>
using namespace std;

class Bin{
public:
    string id;
    string location;
    double fill;
    double rate;
    string status;
    double priority;
    Bin()
    {
        id="";
        location="";
        fill=0;
        rate=0;
        status="NORMAL";
        priority=0;
    }
    Bin(string i,string loc,double f,double r)
    {
        id=i;
        location=loc;
        fill=f;
        rate=r;
        priority=0;
        updateStatus();
        calculatePriority();
    }
    void updateStatus()
    {
        if(fill>=90)
            status="CRITICAL";
        else if(fill>=75)
            status="HIGH";
        else if(fill>=50)
            status="MODERATE";
        else
            status="NORMAL";
    }
    void calculatePriority()
    {
        priority=fill*0.6+rate*0.4;
    }
    string priorityText()
    {
        char buffer[50];
        sprintf(buffer,"%.1f",priority);
        return string(buffer);
    }
    void display()
    {
        cout<<"Bin ID       : "<<id<<endl;
        cout<<"Location     : "<<location<<endl;
        cout<<"Fill Level   : "<<fill<<"%"<<endl;
        cout<<"Fill Rate    : "<<rate<<"% / hour"<<endl;
        cout<<"Status       : "<<status<<endl;
        cout<<"Priority     : "<<priorityText()<<endl;
        cout<<"Collection   : "<<(fill>0?"REQUIRED":"DONE")<<endl;
        cout<<"\n";
    }
};

#endif