#ifndef DATASTORE_H
#define DATASTORE_H

#include<iostream>
#include<fstream>
#include<sstream>
#include<string>
#include<vector>
#include<cstdio>
#include<cstdlib>
#include<windows.h>
#include"Bin.h"
using namespace std;

const string DATA_FILE_NAME="wastex_data.txt";

struct SavedBin{
    string id;
    string location;
    double fill;
    double rate;
};

struct SavedUser{
    string username;
    string password;
    string role;
    string name;
};

struct SavedRequest{
    string requestId;
    string binId;
    string location;
    string priority;
    string status;
    string requestedBy;
    string assignedDriver;
};

struct SavedHistory{
    string binId;
    string location;
    string description;
};

struct SavedRoad{
    string from;
    string to;
    double weight;
};

struct SavedQueue{
    string binId;
};

struct AppData{
    vector<SavedBin> bins;
    vector<SavedUser> users;
    vector<SavedRequest> requests;
    vector<SavedHistory> history;
    vector<SavedRoad> roads;
    vector<SavedQueue> queue;
    int nextRequestId;
    string driverLocation;
    AppData()
    {
        nextRequestId=101;
        driverLocation="Main Gate";
    }
};

class DataStore{
public:
    static string baseFolder()
    {
        char path[MAX_PATH];
        DWORD length=GetModuleFileNameA(NULL,path,MAX_PATH);
        if(length==0 || length>=MAX_PATH)
            return ".";
        string full=string(path);
        int cut=(int)full.find_last_of("\\/");
        if(cut==-1)
            return ".";
        return full.substr(0,cut+1);
    }
    static string filePath()
    {
        return baseFolder()+DATA_FILE_NAME;
    }
    static bool exists()
    {
        ifstream check(filePath().c_str());
        return check.good();
    }
    static string clean(string text)
    {
        for(int i=0;i<(int)text.size();i++)
        {
            if(text[i]=='|')
                text[i]='/';
        }
        return text;
    }
    static string row(vector<string>& parts)
    {
        string line="";
        for(int i=0;i<(int)parts.size();i++)
        {
            if(i>0)
                line+="|";
            line+=clean(parts[i]);
        }
        return line;
    }
    static bool save(AppData& data)
    {
        ofstream out(filePath().c_str());
        if(!out)
            return false;
        out<<"WASTEX_DATA_V1\n";
        out<<"NEXTID|"<<data.nextRequestId<<"\n";
        out<<"LOCATION|"<<clean(data.driverLocation)<<"\n";
        out<<"BINCOUNT|"<<data.bins.size()<<"\n";
        for(int i=0;i<(int)data.bins.size();i++)
        {
            SavedBin b=data.bins[i];
            vector<string> parts;
            parts.push_back(b.id);
            parts.push_back(b.location);
            parts.push_back(FormatValue(b.fill));
            parts.push_back(FormatValue(b.rate));
            out<<row(parts)<<"\n";
        }
        out<<"USERCOUNT|"<<data.users.size()<<"\n";
        for(int i=0;i<(int)data.users.size();i++)
        {
            SavedUser u=data.users[i];
            vector<string> parts;
            parts.push_back(u.username);
            parts.push_back(u.password);
            parts.push_back(u.role);
            parts.push_back(u.name);
            out<<row(parts)<<"\n";
        }
        out<<"REQCOUNT|"<<data.requests.size()<<"\n";
        for(int i=0;i<(int)data.requests.size();i++)
        {
            SavedRequest r=data.requests[i];
            vector<string> parts;
            parts.push_back(r.requestId);
            parts.push_back(r.binId);
            parts.push_back(r.location);
            parts.push_back(r.priority);
            parts.push_back(r.status);
            parts.push_back(r.requestedBy);
            parts.push_back(r.assignedDriver);
            out<<row(parts)<<"\n";
        }
        out<<"HISTCOUNT|"<<data.history.size()<<"\n";
        for(int i=0;i<(int)data.history.size();i++)
        {
            SavedHistory h=data.history[i];
            vector<string> parts;
            parts.push_back(h.binId);
            parts.push_back(h.location);
            parts.push_back(h.description);
            out<<row(parts)<<"\n";
        }
        out<<"ROADCOUNT|"<<data.roads.size()<<"\n";
        for(int i=0;i<(int)data.roads.size();i++)
        {
            SavedRoad r=data.roads[i];
            vector<string> parts;
            parts.push_back(r.from);
            parts.push_back(r.to);
            parts.push_back(FormatValue(r.weight));
            out<<row(parts)<<"\n";
        }
        out<<"QCOUNT|"<<data.queue.size()<<"\n";
        for(int i=0;i<(int)data.queue.size();i++)
            out<<clean(data.queue[i].binId)<<"\n";
        out.close();
        return true;
    }
    static bool load(AppData& data)
    {
        ifstream in(filePath().c_str());
        if(!in)
            return false;
        string line;
        if(!getline(in,line) || line!="WASTEX_DATA_V1")
            return false;
        data.bins.clear();
        data.users.clear();
        data.requests.clear();
        data.history.clear();
        data.roads.clear();
        data.queue.clear();
        data.nextRequestId=101;
        data.driverLocation="Main Gate";
        while(getline(in,line))
        {
            if(line.empty())
                continue;
            vector<string> parts=split(line);
            string tag=parts[0];
            if(tag=="NEXTID" && parts.size()>1)
                data.nextRequestId=atoi(parts[1].c_str());
            else if(tag=="LOCATION" && parts.size()>1)
                data.driverLocation=parts[1];
            else if(tag=="BINCOUNT" && parts.size()>1)
                readBins(in,data,atoi(parts[1].c_str()));
            else if(tag=="USERCOUNT" && parts.size()>1)
                readUsers(in,data,atoi(parts[1].c_str()));
            else if(tag=="REQCOUNT" && parts.size()>1)
                readRequests(in,data,atoi(parts[1].c_str()));
            else if(tag=="HISTCOUNT" && parts.size()>1)
                readHistory(in,data,atoi(parts[1].c_str()));
            else if(tag=="ROADCOUNT" && parts.size()>1)
                readRoads(in,data,atoi(parts[1].c_str()));
            else if(tag=="QCOUNT" && parts.size()>1)
                readQueue(in,data,atoi(parts[1].c_str()));
        }
        in.close();
        return true;
    }
private:
    static string FormatValue(double value)
    {
        char buffer[50];
        sprintf(buffer,"%.2f",value);
        return string(buffer);
    }
    static vector<string> split(string line)
    {
        vector<string> parts;
        string current="";
        for(int i=0;i<(int)line.size();i++)
        {
            if(line[i]=='|')
            {
                parts.push_back(current);
                current="";
            }
            else
                current+=line[i];
        }
        parts.push_back(current);
        return parts;
    }
    static void readBins(ifstream& in,AppData& data,int count)
    {
        string line;
        for(int i=0;i<count;i++)
        {
            if(!getline(in,line))
                return ;
            vector<string> p=split(line);
            if(p.size()<4)
                return ;
            SavedBin b;
            b.id=p[0];
            b.location=p[1];
            b.fill=atof(p[2].c_str());
            b.rate=atof(p[3].c_str());
            data.bins.push_back(b);
        }
    }
    static void readUsers(ifstream& in,AppData& data,int count)
    {
        string line;
        for(int i=0;i<count;i++)
        {
            if(!getline(in,line))
                return ;
            vector<string> p=split(line);
            if(p.size()<4)
                return ;
            SavedUser u;
            u.username=p[0];
            u.password=p[1];
            u.role=p[2];
            u.name=p[3];
            data.users.push_back(u);
        }
    }
    static void readRequests(ifstream& in,AppData& data,int count)
    {
        string line;
        for(int i=0;i<count;i++)
        {
            if(!getline(in,line))
                return ;
            vector<string> p=split(line);
            if(p.size()<7)
                return ;
            SavedRequest r;
            r.requestId=p[0];
            r.binId=p[1];
            r.location=p[2];
            r.priority=p[3];
            r.status=p[4];
            r.requestedBy=p[5];
            r.assignedDriver=p[6];
            data.requests.push_back(r);
        }
    }
    static void readHistory(ifstream& in,AppData& data,int count)
    {
        string line;
        for(int i=0;i<count;i++)
        {
            if(!getline(in,line))
                return ;
            vector<string> p=split(line);
            if(p.size()<3)
                return ;
            SavedHistory h;
            h.binId=p[0];
            h.location=p[1];
            h.description=p[2];
            data.history.push_back(h);
        }
    }
    static void readRoads(ifstream& in,AppData& data,int count)
    {
        string line;
        for(int i=0;i<count;i++)
        {
            if(!getline(in,line))
                return ;
            vector<string> p=split(line);
            if(p.size()<3)
                return ;
            SavedRoad r;
            r.from=p[0];
            r.to=p[1];
            r.weight=atof(p[2].c_str());
            data.roads.push_back(r);
        }
    }
    static void readQueue(ifstream& in,AppData& data,int count)
    {
        string line;
        for(int i=0;i<count;i++)
        {
            if(!getline(in,line))
                return ;
            SavedQueue q;
            q.binId=line;
            data.queue.push_back(q);
        }
    }
};

#endif