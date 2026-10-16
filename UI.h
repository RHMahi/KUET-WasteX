#ifndef UI_H
#define UI_H

#include<iostream>
#include<string>
using namespace std;

const string ARROW="\u2192";
const string DOWN="\u2193";

inline void PrintSuccess(string message)
{
    cout<<"[OK] "<<message<<"\n";
}

inline void PrintError(string message)
{
    cout<<"[ERROR] "<<message<<"\n";
}

inline void PrintInfo(string message)
{
    cout<<"[INFO] "<<message<<"\n";
}

inline void PrintTitle(string title)
{
    cout<<"\n"<<title<<"\n\n";
}

inline void PrintRow(string label,string value)
{
    cout<<label;
    for(int i=(int)label.size();i<22;i++)
        cout<<" ";
    cout<<": "<<value<<"\n";
}

#endif