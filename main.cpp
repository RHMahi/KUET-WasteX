#include<iostream>
#include<string>
#include<vector>
#include<conio.h>
#include<windows.h>
#include<cstdio>
#include"Bin.h"
#include"LinkedList.h"
#include"Stack.h"
#include"Queue.h"
#include"PriorityQueue.h"
#include"BST.h"
#include"Graph.h"
#include"Dijkstra.h"
#include"SortSearch.h"
#include"User.h"
#include"Request.h"
#include"DataStore.h"
#include"UI.h"
using namespace std;

string Format2(double value)
{
    char buffer[50];
    sprintf(buffer,"%.2f",value);
    return string(buffer);
}

string Format1(double value)
{
    char buffer[50];
    sprintf(buffer,"%.1f",value);
    return string(buffer);
}

string Format0(double value)
{
    char buffer[50];
    sprintf(buffer,"%.0f",value);
    return string(buffer);
}

void PrintLogout()
{
    cout<<"\nSuccessfully logged out.\n\n\n";
    cout<<"Thank you for using KUET WasteX.\n";
    cout<<"Smart Campus \u2022 Cleaner Campus\n";
}

void PrintMainBanner()
{
    cout<<"\nKUET WASTEX\n";
    cout<<"Smart Waste Collection System\n\n";
    cout<<"Select who you are:\n";
}

void printRoute(string from,string to,vector<string> path,double total);
void printComplete(string binId,string location,string previous,string driverName,string requestId);

Bin bins[100];
int binCount=0;
Queue requestQueue;
HistoryList history;
BST locationTree;
Graph graph;
UserList userList;
RequestList requestList;
string driverLocation="Main Gate";

AppData collectData()
{
    AppData data;
    data.nextRequestId=requestList.nextId;
    data.driverLocation=driverLocation;
    for(int i=0;i<binCount;i++)
    {
        SavedBin b;
        b.id=bins[i].id;
        b.location=bins[i].location;
        b.fill=bins[i].fill;
        b.rate=bins[i].rate;
        data.bins.push_back(b);
    }
    for(int i=0;i<userList.count;i++)
    {
        SavedUser u;
        u.username=userList.users[i].username;
        u.password=userList.users[i].password;
        u.role=userList.users[i].role;
        u.name=userList.users[i].name;
        data.users.push_back(u);
    }
    RequestNode*rn=requestList.head;
    while(rn!=NULL)
    {
        SavedRequest r;
        r.requestId=rn->data.requestId;
        r.binId=rn->data.binId;
        r.location=rn->data.location;
        r.priority=rn->data.priority;
        r.status=rn->data.status;
        r.requestedBy=rn->data.requestedBy;
        r.assignedDriver=rn->data.assignedDriver;
        data.requests.push_back(r);
        rn=rn->next;
    }
    HistoryNode*hn=history.head;
    while(hn!=NULL)
    {
        SavedHistory h;
        h.binId=hn->binId;
        h.location=hn->location;
        h.description=hn->description;
        data.history.push_back(h);
        hn=hn->next;
    }
    for(int i=0;i<graph.nodeCount();i++)
    {
        for(int j=0;j<(int)graph.adjList[i].size();j++)
        {
            if(graph.adjList[i][j].destination<=i)
                continue ;
            SavedRoad r;
            r.from=graph.getName(i);
            r.to=graph.getName(graph.adjList[i][j].destination);
            r.weight=graph.adjList[i][j].weight;
            data.roads.push_back(r);
        }
    }
    Queue temp=requestQueue;
    while(!temp.isEmpty())
    {
        SavedQueue q;
        q.binId=temp.dequeue();
        data.queue.push_back(q);
    }
    return data;
}

void saveData()
{
    AppData data=collectData();
    if(!DataStore::save(data))
        PrintError("Could not write "+DATA_FILE_NAME+".");
}

void restoreData(AppData& data)
{
    binCount=0;
    for(int i=0;i<(int)data.bins.size();i++)
    {
        SavedBin&b=data.bins[i];
        bins[binCount]=Bin(b.id,b.location,b.fill,b.rate);
        binCount++;
    }
    userList.clear();
    for(int i=0;i<(int)data.users.size();i++)
    {
        SavedUser&u=data.users[i];
        userList.addUser(u.username,u.password,u.role,u.name);
    }
    requestList.clear();
    for(int i=0;i<(int)data.requests.size();i++)
    {
        SavedRequest&r=data.requests[i];
        Request req;
        req.requestId=r.requestId;
        req.binId=r.binId;
        req.location=r.location;
        req.priority=r.priority;
        req.status=r.status;
        req.requestedBy=r.requestedBy;
        req.assignedDriver=r.assignedDriver;
        requestList.addRequest(req);
    }
    requestList.nextId=data.nextRequestId;
    if(requestList.nextId<101)
        requestList.nextId=101;
    history.clear();
    for(int i=(int)data.history.size()-1;i>=0;i--)
        history.addRecord(data.history[i].binId,data.history[i].location,data.history[i].description);
    requestQueue=Queue();
    for(int i=0;i<(int)data.queue.size();i++)
        requestQueue.enqueue(data.queue[i].binId);
    driverLocation=data.driverLocation;
    graph.clearEdges();
    for(int i=0;i<(int)data.roads.size();i++)
    {
        SavedRoad&r=data.roads[i];
        if(graph.getIndex(r.from)!=-1 && graph.getIndex(r.to)!=-1)
            graph.addEdge(r.from,r.to,r.weight);
    }
}

string readPassword()
{
    while(_kbhit())
        _getch();
    string password="";
    while(1)
    {
        char ch=_getch();
        if(ch==13)
            break;
        if(ch==8)
        {
            if(password.size()>0)
            {
                password.erase(password.size()-1,1);
                cout<<"\b \b";
            }
        }
        else
        {
            if(ch>=32 && ch<=126)
            {
                password+=ch;
                cout<<"*";
            }
        }
    }
    cout<<endl;
    return password;
}

int findBinIndexById(string id)
{
    for(int i=0;i<binCount;i++)
    {
        if(bins[i].id==id)
            return i;
    }
    return -1;
}

Bin*findBinById(string id)
{
    int index=findBinIndexById(id);
    if(index==-1)
        return NULL;
    return &bins[index];
}

string priorityFromStatus(string status)
{
    if(status=="CRITICAL")
        return "HIGH";
    if(status=="HIGH" || status=="MODERATE")
        return "MEDIUM";
    return "LOW";
}

void seedBins()
{
    bins[binCount++]=Bin("B01","Cafeteria",85,4);
    bins[binCount++]=Bin("B02","Academic Area",60,6);
    bins[binCount++]=Bin("B03","S.S.H",95,3);
    bins[binCount++]=Bin("B04","Main Gate",40,2);
    bins[binCount++]=Bin("B05","Administration",70,5);
}

void seedLocations()
{
    locationTree.insert(1,"Main Gate");
    locationTree.insert(2,"Janata Bank");
    locationTree.insert(3,"Pocket Gate");
    locationTree.insert(4,"Post Office");
    locationTree.insert(5,"Central Field");
    locationTree.insert(6,"Academic Area");
    locationTree.insert(7,"Administration");
    locationTree.insert(8,"Cafeteria");
    locationTree.insert(9,"S.S.H");
    locationTree.insert(10,"A.E.H");
    locationTree.insert(11,"F.A.H");
    locationTree.insert(12,"K.A.H");
    locationTree.insert(13,"R.H");
    locationTree.insert(14,"Guest House");
    locationTree.insert(15,"IT Park");
}

void seedUsers()
{
    userList.addUser("admin","admin123","Admin","System Administrator");
    userList.addUser("driver1","drive123","Driver","Rahim");
    userList.addUser("student1","pass123","User","Karim");
}

void seedRequests()
{
    Request r;
    r.requestId=requestList.generateId();
    r.binId="B03";
    r.location="S.S.H";
    r.priority="HIGH";
    r.status="Pending";
    r.requestedBy="student1";
    requestList.addRequest(r);
    requestQueue.enqueue("B03");
}

void startProgram()
{
    buildCampusGraph(graph);
    seedLocations();
    AppData saved;
    if(DataStore::load(saved))
    {
        restoreData(saved);
        PrintSuccess("Saved data loaded from "+DATA_FILE_NAME+".");
    }
    else
    {
        seedBins();
        seedUsers();
        seedRequests();
        saveData();
        PrintInfo("Fresh start. Default data created in "+DATA_FILE_NAME+".");
    }
}

void addBin()
{
    if(binCount>=100)
    {
        PrintError("Bin storage is full.");
        return ;
    }
    string id;
    string location;
    double fill;
    double rate;
    cout<<"Enter Bin ID: ";
    getline(cin,id);
    if(findBinIndexById(id)!=-1)
    {
        PrintError("A bin with this ID already exists.");
        return ;
    }
    cout<<"Enter Location: ";
    getline(cin,location);
    if(graph.getIndex(location)==-1)
        PrintError("'"+location+"' is not a known campus location.");
    cout<<"Enter Current Fill %: ";
    cin>>fill;
    cout<<"Enter Fill Rate (%/hour): ";
    cin>>rate;
    cin.get();
    bins[binCount]=Bin(id,location,fill,rate);
    binCount++;
    PrintSuccess("Bin "+id+" added successfully.");
    saveData();
}

void deleteBin()
{
    if(binCount==0)
    {
        PrintError("No bins to delete.");
        return ;
    }
    string id;
    cout<<"Enter Bin ID to delete: ";
    getline(cin,id);
    int index=findBinIndexById(id);
    if(index==-1)
    {
        PrintError("Bin not found.");
        return ;
    }
    for(int i=index;i<binCount-1;i++)
        bins[i]=bins[i+1];
    binCount--;
    PrintSuccess("Bin "+id+" deleted successfully.");
    saveData();
}

void updateBin()
{
    string id;
    cout<<"Enter Bin ID to update: ";
    getline(cin,id);
    int index=findBinIndexById(id);
    if(index==-1)
    {
        PrintError("Bin not found.");
        return ;
    }
    cout<<"Enter new Fill %: ";
    cin>>bins[index].fill;
    cout<<"Enter new Fill Rate (%/hour): ";
    cin>>bins[index].rate;
    cin.get();
    bins[index].updateStatus();
    bins[index].calculatePriority();
    PrintSuccess("Bin "+id+" updated successfully.");
    saveData();
}

void displayBins()
{
    PrintTitle("ALL BINS");
    if(binCount==0)
    {
        PrintError("No bins available.");
        return ;
    }
    for(int i=0;i<binCount;i++)
        bins[i].display();
}

void searchBin()
{
    if(binCount==0)
    {
        PrintError("No bins to search.");
        return ;
    }
    string id;
    cout<<"Enter Bin ID to search: ";
    getline(cin,id);
    PrintInfo("Bins arranged by ID, then searched.");
    Bin sorted[100];
    for(int i=0;i<binCount;i++)
        sorted[i]=bins[i];
    SortSearch::sortBinsById(sorted,binCount);
    SearchResult result=SortSearch::binarySearch(sorted,binCount,id);
    if(result.found)
    {
        PrintSuccess("Bin found after "+to_string(result.steps)+" comparisons.");
        cout<<"\n";
        result.bin.display();
    }
    else
        PrintError("Bin not found after "+to_string(result.steps)+" comparisons.");
}

void binManagement()
{
    while(1)
    {
        PrintTitle("BIN MANAGEMENT");
        cout<<"1. Add Bin\n";
        cout<<"2. Delete Bin\n";
        cout<<"3. Update Bin\n";
        cout<<"4. Display All Bins\n";
        cout<<"5. Search Bin\n";
        cout<<"6. Back\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        switch(choice)
        {
        case 1:
            addBin();
            break;
        case 2:
            deleteBin();
            break;
        case 3:
            updateBin();
            break;
        case 4:
            displayBins();
            break;
        case 5:
            searchBin();
            break;
        case 6:
            return ;
        default:
            PrintError("Invalid choice.");
        }
    }
}

void makeCollectionRequest(string binId,string username)
{
    int index=findBinIndexById(binId);
    if(index==-1)
    {
        PrintError("Bin not found.");
        return ;
    }
    Request r;
    r.requestId=requestList.generateId();
    r.binId=binId;
    r.location=bins[index].location;
    r.priority=priorityFromStatus(bins[index].status);
    r.status="Pending";
    r.requestedBy=username;
    requestList.addRequest(r);
    requestQueue.enqueue(binId);
    PrintTitle("COLLECTION REQUEST");
    r.display();
    PrintSuccess("Request "+r.requestId+" created successfully.");
    saveData();
}

void historyManagement()
{
    while(1)
    {
        PrintTitle("COLLECTION HISTORY");
        cout<<"1. Show History\n";
        cout<<"2. Search History\n";
        cout<<"3. Delete Record\n";
        cout<<"4. Back\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        switch(choice)
        {
        case 1:
            history.display();
            break;
        case 2:
        {
            string id;
            cout<<"Enter Bin ID to search: ";
            getline(cin,id);
            history.searchRecord(id);
            break;
        }
        case 3:
        {
            string id;
            cout<<"Enter Bin ID to delete: ";
            getline(cin,id);
            if(history.deleteRecord(id))
            {
                PrintSuccess("Record deleted.");
                saveData();
            }
            else
                PrintError("Record not found.");
            break;
        }
        case 4:
            return ;
        default:
            PrintError("Invalid choice.");
        }
    }
}

void addRoad()
{
    string from;
    string to;
    double weight;
    cout<<"Enter first location: ";
    getline(cin,from);
    cout<<"Enter second location: ";
    getline(cin,to);
    cout<<"Enter road distance (km): ";
    cin>>weight;
    cin.get();
    if(graph.getIndex(from)==-1 || graph.getIndex(to)==-1)
    {
        PrintError("One or both locations do not exist in the campus network.");
        return ;
    }
    graph.addEdge(from,to,weight);
    PrintTitle("ROAD ADDED SUCCESSFULLY");
    cout<<"From       : "<<from<<endl;
    cout<<"To         : "<<to<<endl;
    cout<<"Distance   : "<<Format2(weight)<<" km"<<endl;
    cout<<"Network    : Updated\n";
    saveData();
}

void shortestPathMenu()
{
    string from;
    string to;
    cout<<"Enter source location: ";
    getline(cin,from);
    cout<<"Enter destination location: ";
    getline(cin,to);
    if(graph.getIndex(from)==-1 || graph.getIndex(to)==-1)
    {
        PrintError("Invalid source or destination.");
        return ;
    }
    Dijkstra d;
    d.run(graph,from);
    vector<string> path=d.getPath(to);
    if(path.empty())
    {
        PrintError("No path found.");
        return ;
    }
    printRoute(from,to,path,d.getDistance(to));
}

void campusGraph()
{
    while(1)
    {
        PrintTitle("CAMPUS ROAD NETWORK");
        cout<<"1. Add Road\n";
        cout<<"2. Display Graph\n";
        cout<<"3. Level-wise Traversal\n";
        cout<<"4. Depth-wise Traversal\n";
        cout<<"5. Shortest Route\n";
        cout<<"6. Back\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        switch(choice)
        {
        case 1:
            addRoad();
            break;
        case 2:
            graph.display();
            break;
        case 3:
        {
            string start;
            cout<<"Enter start location: ";
            getline(cin,start);
            graph.bfs(start);
            break;
        }
        case 4:
        {
            string start;
            cout<<"Enter start location: ";
            getline(cin,start);
            graph.dfs(start);
            break;
        }
        case 5:
            shortestPathMenu();
            break;
        case 6:
            return ;
        default:
            PrintError("Invalid choice.");
        }
    }
}

void searchSortMenu()
{
    if(binCount==0)
    {
        PrintError("No bins available.");
        return ;
    }
    PrintTitle("SEARCH BIN & SORT BINS");
    cout<<"1. Search Bin\n";
    cout<<"2. Sort by Fill %\n";
    cout<<"3. Sort by Fill Rate\n";
    cout<<"4. Sort by Priority\n";
    cout<<"5. Sort by Bin ID\n";
    cout<<"6. Back\n";
    cout<<"Enter choice: ";
    int choice;
    if(!(cin>>choice))
        return ;
    cin.get();
    if(choice==1)
    {   
        searchBin();
        return ;
    }
    string key;
    bool descending=true;
    if(choice==2)
        key="fill";
    else if(choice==3)
        key="rate";
    else if(choice==4)
        key="priority";
    else if(choice==5)
    {
        key="id";
        descending=false;
    }
    else
        return ;
    Bin sorted[100];
    for(int i=0;i<binCount;i++)
        sorted[i]=bins[i];
    SortSearch::sortBins(sorted,binCount,key,descending);
    PrintTitle("SORTED BINS");
    for(int i=0;i<binCount;i++)
        sorted[i].display();
}

void overviewBinStatus()
{
    PrintTitle("BIN STATUS ("+to_string(binCount)+")");
    if(binCount==0)
        PrintError("No bins available.");
    for(int i=0;i<binCount;i++)
        bins[i].display();
}

void overviewActiveRequests()
{
    requestList.displayActive();
    cout<<"\n Pending Request Queue:\n ";
    requestQueue.display();
}

void overviewUsers()
{
    userList.display();
}

void overviewHistory()
{
    history.display();
}

void overviewCampusNetwork()
{
    locationTree.showInorder();
    cout<<"\n";
    graph.display();
}

void overviewPriorityQueue()
{
    PriorityQueue pq;
    for(int i=0;i<binCount;i++)
    {
        if(bins[i].fill>0)
        {
            bins[i].calculatePriority();
            pq.push(bins[i]);
        }
    }
    if(pq.isEmpty())
        PrintError("No bins need collection.");
    else
        pq.displayTable();
}

void systemOverview()
{
    while(1)
    {
        PrintTitle("SYSTEM OVERVIEW");
        cout<<"1. Bin Status\n";
        cout<<"2. Active Requests\n";
        cout<<"3. Users\n";
        cout<<"4. Collection History\n";
        cout<<"5. Campus Network\n";
        cout<<"6. Priority Queue\n";
        cout<<"0. Back\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        if(choice==0)
            return ;
        cout<<"\n";
        switch(choice)
        {
        case 1:
            overviewBinStatus();
            break;
        case 2:
            overviewActiveRequests();
            break;
        case 3:
            overviewUsers();
            break;
        case 4:
            overviewHistory();
            break;
        case 5:
            overviewCampusNetwork();
            break;
        case 6:
            overviewPriorityQueue();
            break;
        default:
            PrintError("Invalid choice.");
        }
    }
}

void systemStatistics()
{
    int critical=0;
    int high=0;
    int moderate=0;
    int normal=0;
    double totalFill=0;
    for(int i=0;i<binCount;i++)
    {
        if(bins[i].status=="CRITICAL")
            critical++;
        else if(bins[i].status=="HIGH")
            high++;
        else if(bins[i].status=="MODERATE")
            moderate++;
        else
            normal++;
        totalFill+=bins[i].fill;
    }
    double average=0;
    if(binCount>0)
        average=totalFill/binCount;

    PrintTitle("SYSTEM STATISTICS");
    PrintTitle("BIN STATISTICS");
    PrintRow("Total Bins",to_string(binCount));
    PrintRow("Critical",to_string(critical));
    PrintRow("High",to_string(high));
    PrintRow("Moderate",to_string(moderate));
    PrintRow("Normal",to_string(normal));
    PrintRow("Average Fill",Format1(average)+"%");

    PrintTitle("COLLECTION STATISTICS");
    PrintRow("Pending Requests",to_string(requestList.countByStatus("Pending")));
    PrintRow("Assigned Requests",to_string(requestList.countByStatus("Assigned")));
    PrintRow("Completed Requests",to_string(requestList.countByStatus("Completed")));
    PrintRow("Cancelled Requests",to_string(requestList.countByStatus("Cancelled")));

    PrintTitle("SYSTEM");
    PrintRow("Locations",to_string(locationTree.totalLocations()));
    PrintRow("Road Segments",to_string(graph.edgeCount()));
    PrintRow("Registered Users",to_string(userList.count));
    PrintRow("Collection Records",to_string(history.count));
}

void assignDriverMenu()
{
    PrintTitle("AVAILABLE DRIVERS");
    int totalDrivers=0;
    for(int i=0;i<userList.count;i++)
    {
        if(userList.users[i].role=="Driver")
        {
            cout<<userList.users[i].username<<" ("<<userList.users[i].name<<")\n";
            totalDrivers++;
        }
    }
    if(totalDrivers==0)
    {
        PrintError("No drivers registered.");
        return ;
    }
    cout<<"\nActive Requests:\n";
    requestList.displayActive();
    string requestId;
    string driver;
    cout<<"\nEnter Request ID to assign: ";
    getline(cin,requestId);
    if(requestList.find(requestId)==NULL)
    {
        PrintError("Request not found.");
        return ;
    }
    cout<<"Enter driver username: ";
    getline(cin,driver);
    int index=userList.findIndex(driver);
    if(index==-1 || userList.users[index].role!="Driver")
    {
        PrintError("Invalid driver.");
        return ;
    }
    requestList.assignDriver(requestId,driver);
    PrintSuccess("Driver "+driver+" assigned to request "+requestId+".");
    saveData();
}

void cancelRequestMenu()
{
    requestList.displayActive();
    string requestId;
    cout<<"\nEnter Request ID to cancel: ";
    getline(cin,requestId);
    if(requestList.cancelRequest(requestId))
    {
        PrintSuccess("Request "+requestId+" cancelled.");
        saveData();
    }
    else
        PrintError("Request not found.");
}

void addAccount(string role)
{
    string username;
    string password;
    string name;
    cout<<"Enter username: ";
    getline(cin,username);
    if(userList.findIndex(username)!=-1)
    {
        PrintError("Username already exists.");
        return ;
    }
    cout<<"Enter password: ";
    password=readPassword();
    cout<<"Enter full name: ";
    getline(cin,name);
    if(userList.addUser(username,password,role,name))
    {
        PrintSuccess(role+" "+username+" added successfully.");
        saveData();
    }
    else
        PrintError("Could not add account (storage full).");
}

void manageUsers()
{
    while(1)
    {
        PrintTitle("MANAGE USERS");
        cout<<"1. Add User\n";
        cout<<"2. Add Driver\n";
        cout<<"3. Add Admin\n";
        cout<<"4. Delete User\n";
        cout<<"5. View Users\n";
        cout<<"6. Back\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        if(choice==1)
        {
            PrintTitle("ADD USER ACCOUNT");
            addAccount("User");
        }
        else if(choice==2)
        {
            PrintTitle("ADD DRIVER ACCOUNT");
            addAccount("Driver");
        }
        else if(choice==3)
        {
            PrintTitle("ADD ADMIN ACCOUNT");
            addAccount("Admin");
        }
        else if(choice==4)
        {
            string username;
            cout<<"Enter username to delete: ";
            getline(cin,username);
            if(userList.deleteUser(username))
            {
                PrintSuccess("User "+username+" deleted.");
                saveData();
            }
            else
                PrintError("User not found.");
        }
        else if(choice==5)
            userList.display();
        else if(choice==6)
            return ;
        else
            PrintError("Invalid choice.");
    }
}

void manageRequests()
{
    while(1)
    {
        PrintTitle("MANAGE COLLECTION REQUESTS");
        cout<<"1. View Requests\n";
        cout<<"2. Assign Driver\n";
        cout<<"3. Cancel Request\n";
        cout<<"4. Back\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        switch(choice)
        {
        case 1:
            requestList.displayAll();
            break;
        case 2:
            assignDriverMenu();
            break;
        case 3:
            cancelRequestMenu();
            break;
        case 4:
            return ;
        default:
            PrintError("Invalid choice.");
        }
    }
}

void adminPanel()
{
    while(1)
    {
        PrintTitle("ADMIN PANEL");
        cout<<"1. Manage Bins\n";
        cout<<"2. Manage Users\n";
        cout<<"3. Manage Collection Requests\n";
        cout<<"4. View Collection History\n";
        cout<<"5. Campus Road Network\n";
        cout<<"6. Search Bin & Sort Bins\n";
        cout<<"7. System Statistics\n";
        cout<<"8. System Overview (All Information)\n";
        cout<<"0. Logout\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        switch(choice)
        {
        case 1:
            binManagement();
            break;
        case 2:
            manageUsers();
            break;
        case 3:
            manageRequests();
            break;
        case 4:
            history.display();
            break;
        case 5:
            campusGraph();
            break;
        case 6:
            searchSortMenu();
            break;
        case 7:
            systemStatistics();
            break;
        case 8:
            systemOverview();
            break;
        case 0:
            PrintLogout();
            return ;
        default:
            PrintError("Invalid choice.");
        }
    }
}

void reportFullBin(string username)
{
    if(binCount==0)
    {
        PrintError("No bins available.");
        return ;
    }
    string id;
    cout<<"Enter Bin ID to report: ";
    getline(cin,id);
    int index=findBinIndexById(id);
    if(index==-1)
    {
        PrintError("Bin not found.");
        return ;
    }
    bins[index].fill=100;
    bins[index].updateStatus();
    bins[index].calculatePriority();
    saveData();
    PrintSuccess("Bin "+id+" reported as FULL. Location: "+bins[index].location);
    cout<<"Create collection request now?\n";
    cout<<"1. Yes\n";
    cout<<"2. No\n";
    cout<<"Enter choice: ";
    int choice;
    if(!(cin>>choice))
        return ;
    cin.get();
    if(choice==1)
        makeCollectionRequest(id,username);
    else
        PrintInfo("You can create a request later from the menu.");
}

void createRequestMenu(string username)
{
    if(binCount==0)
    {
        PrintError("No bins available.");
        return ;
    }
    string id;
    cout<<"Enter Bin ID: ";
    getline(cin,id);
    int index=findBinIndexById(id);
    if(index==-1)
    {
        PrintError("Bin not found.");
        return ;
    }
    cout<<"Current Fill: "<<bins[index].fill<<"%"<<endl;
    cout<<"Location    : "<<bins[index].location<<endl;
    cout<<"Create collection request?\n";
    cout<<"1. Yes\n";
    cout<<"2. No\n";
    cout<<"Enter choice: ";
    int choice;
    if(!(cin>>choice))
        return ;
    cin.get();
    if(choice==1)
        makeCollectionRequest(id,username);
    else
        PrintInfo("Request cancelled.");
}

void viewNearbyBins()
{
    if(binCount==0)
    {
        PrintError("No bins available.");
        return ;
    }
    string from;
    cout<<"Enter your current location: ";
    getline(cin,from);
    if(graph.getIndex(from)==-1)
    {
        PrintError("Unknown location.");
        return ;
    }
    Dijkstra d;
    d.run(graph,from);
    Bin sorted[100];
    double distance[100];
    for(int i=0;i<binCount;i++)
    {
        sorted[i]=bins[i];
        distance[i]=d.getDistance(bins[i].location);
    }
    for(int i=0;i<binCount-1;i++)
    {
        int best=i;
        for(int j=i+1;j<binCount;j++)
        {
            if(distance[j]<distance[best])
                best=j;
        }
        Bin tb=sorted[i];
        sorted[i]=sorted[best];
        sorted[best]=tb;
        double td=distance[i];
        distance[i]=distance[best];
        distance[best]=td;
    }
    PrintTitle("NEARBY BINS FROM "+from);
    for(int i=0;i<binCount;i++)
    {
        cout<<sorted[i].id<<" | "<<sorted[i].location
            <<" | Fill: "<<sorted[i].fill<<"% | Status: "<<sorted[i].status;
        if(distance[i]>=1e9)
            cout<<" | Distance: unreachable\n";
        else
            cout<<" | Distance: "<<distance[i]<<" km\n";
    }
}

void trackRequestMenu(string username)
{
    PrintTitle("TRACK REQUEST");
    cout<<"Enter Request ID or Bin ID: ";
    string key;
    getline(cin,key);
    Request*r=requestList.find(key);
    if(r==NULL || (r->requestedBy!=username && username!="admin"))
        r=requestList.findByBin(key);
    if(r==NULL)
    {
        PrintError("No request found for "+key+".");
        return ;
    }
    cout<<"\n";
    r->display();
}

void userPanel(string username)
{
    while(1)
    {
        cout<<"\nUSER PORTAL\n\n";
        cout<<"1. Find Nearby Bins\n";
        cout<<"2. Search Bin\n";
        cout<<"3. Report Full Bin\n";
        cout<<"4. Create Collection Request\n";
        cout<<"5. My Requests\n";
        cout<<"6. Track Request\n";
        cout<<"7. My Collection History\n\n";
        cout<<"0. Logout\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        switch(choice)
        {
        case 1:
            viewNearbyBins();
            break;
        case 2:
            searchBin();
            break;
        case 3:
            reportFullBin(username);
            break;
        case 4:
            createRequestMenu(username);
            break;
        case 5:
            requestList.displayByUser(username);
            break;
        case 6:
            trackRequestMenu(username);
            break;
        case 7:
            history.display();
            break;
        case 0:
            PrintLogout();
            return ;
        default:
            PrintError("Invalid choice.");
        }
    }
}

void removeFromRequestQueue(string binId)
{
    Queue rebuilt;
    while(!requestQueue.isEmpty())
    {
        string value=requestQueue.dequeue();
        if(value!=binId)
            rebuilt.enqueue(value);
    }
    requestQueue=rebuilt;
}

void collectBin(string driver)
{
    if(binCount==0)
    {
        PrintError("No bins available.");
        return ;
    }
    string id;
    cout<<"Enter Bin ID to collect: ";
    getline(cin,id);
    int index=findBinIndexById(id);
    if(index==-1)
    {
        PrintError("Bin not found.");
        return ;
    }
    string previousFill=Format0(bins[index].fill);
    string location=bins[index].location;
    string binId=bins[index].id;
    Request*req=requestList.findByBin(binId);
    string requestId="--";
    if(req!=NULL)
        requestId=req->requestId;
    driverLocation=location;
    bins[index].fill=0;
    bins[index].updateStatus();
    bins[index].calculatePriority();
    history.addRecord(binId,location,"Collected by driver "+userList.displayName(driver));
    requestList.completeByBin(binId);
    removeFromRequestQueue(binId);
    saveData();
    printComplete(binId,location,previousFill,userList.displayName(driver),requestId);
}

void viewPriorityBins()
{
    if(binCount==0)
    {
        PrintError("No bins available.");
        return ;
    }
    PriorityQueue pq;
    for(int i=0;i<binCount;i++)
    {
        if(bins[i].fill>0)
        {
            bins[i].calculatePriority();
            pq.push(bins[i]);
        }
    }
    if(pq.isEmpty())
    {
        PrintError("No bins need collection.");
        return ;
    }
    pq.displayTable();
}

void printRoute(string from,string to,vector<string> path,double total)
{
    PrintTitle("SHORTEST ROUTE");
    PrintRow("Source",from);
    PrintRow("Destination",to);
    PrintRow("Route Type","Shortest Path");
    cout<<"\n";
    for(int i=0;i<(int)path.size();i++)
    {
        cout<<"  "<<path[i]<<"\n";
        if(i!=(int)path.size()-1)
            cout<<"  "<<DOWN<<" "<<Format2(graph.getEdgeWeight(path[i],path[i+1]))<<" km\n";
    }
    cout<<"\n";
    PrintRow("Total Distance",Format2(total)+" km");
}

void printComplete(string binId,string location,string previous,string driverName,string requestId)
{
    PrintTitle("COLLECTION COMPLETE");
    PrintRow("Bin ID",binId);
    PrintRow("Location",location);
    PrintRow("Previous",previous+"%");
    PrintRow("Current","0%");
    PrintRow("Driver",driverName);
    PrintRow("Request",requestId);
    PrintRow("Status","COMPLETED");
}

void smartCollection(string start,string driver)
{
    if(binCount==0)
    {
        PrintError("No bins available for collection.");
        return ;
    }
    if(graph.getIndex(start)==-1)
    {
        PrintError("Invalid starting location.");
        return ;
    }

    PriorityQueue pq;
    for(int i=0;i<binCount;i++)
    {
        if(bins[i].fill>0)
        {
            bins[i].calculatePriority();
            pq.push(bins[i]);
        }
    }
    if(pq.isEmpty())
    {
        PrintError("No bins need collection. All bins are empty.");
        return ;
    }

    PrintTitle("SMART WASTE COLLECTION");
    cout<<"Starting point: "<<start<<"\n\n";
    pq.displayTable();

    string current=start;
    double totalDistance=0;
    int collected=0;
    string array[100];
    int orderCount=0;
    string driverName=userList.displayName(driver);

    while(!pq.isEmpty())
    {
        Bin target=pq.pop();
        Dijkstra d;
        d.run(graph,current);
        vector<string> path=d.getPath(target.location);
        if(path.empty())
        {
            PrintInfo("Bin "+target.id+" at "+target.location+" is unreachable. Skipped.");
            continue;
        }
        double legDistance=d.getDistance(target.location);
        string previousFill=Format0(target.fill);
        Request*req=requestList.findByBin(target.id);
        string requestId="--";
        if(req!=NULL)
            requestId=req->requestId;
        cout<<"\n";
        printRoute(current,target.location,path,legDistance);
        totalDistance+=legDistance;
        collected++;
        array[orderCount++]=target.id;
        history.addRecord(target.id,target.location,"Collected via smart route");
        requestList.completeByBin(target.id);
        removeFromRequestQueue(target.id);
        int index=findBinIndexById(target.id);
        if(index!=-1)
        {
            bins[index].fill=0;
            bins[index].updateStatus();
            bins[index].calculatePriority();
        }
        printComplete(target.id,target.location,previousFill,driverName,requestId);
        current=target.location;
        driverLocation=current;
    }

    Dijkstra back;
    back.run(graph,current);
    vector<string> homePath=back.getPath(start);
    double homeDistance=back.getDistance(start);
    if(!homePath.empty())
    {
        printRoute(current,start,homePath,homeDistance);
        totalDistance+=homeDistance;
    }

    PrintTitle("COLLECTION STATISTICS");
    PrintRow("Starting Point",start);
    PrintRow("Bins Collected",to_string(collected));
    PrintRow("Total Distance",Format2(totalDistance)+" km");
    string orderText="";
    for(int i=0;i<orderCount;i++)
    {
        orderText+=array[i];
        if(i!=orderCount-1)
            orderText+=" -> ";
    }
    if(orderCount==0)
        orderText="None";
    PrintRow("Collection Order",orderText);
    PrintRow("Truck Final Status","Returned to "+start);
    saveData();
}

void startCollection(string driver)
{
    if(binCount==0)
    {
        PrintError("No bins available.");
        return ;
    }
    string start;
    cout<<"Driver "<<userList.displayName(driver)<<", enter truck starting location: ";
    getline(cin,start);
    smartCollection(start,driver);
    if(graph.getIndex(start)!=-1)
    {
        driverLocation=start;
        saveData();
    }
}

void driverPanel(string username,string driverName)
{
    while(1)
    {
        cout<<"\nDRIVER PORTAL\n\n";
        cout<<"Driver       : "<<driverName<<endl;
        cout<<"Current Area : "<<driverLocation<<endl;
        cout<<"\n1. Assigned Requests\n";
        cout<<"2. Priority Bins\n";
        cout<<"3. Start Smart Collection\n";
        cout<<"4. Find Shortest Route\n";
        cout<<"5. Collect Bin\n";
        cout<<"6. Collection History\n";
        cout<<"7. Current Location\n\n";
        cout<<"0. Logout\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        switch(choice)
        {
        case 1:
            requestList.displayByDriver(username);
            break;
        case 2:
            viewPriorityBins();
            break;
        case 3:
            startCollection(username);
            break;
        case 4:
            shortestPathMenu();
            break;
        case 5:
            collectBin(username);
            break;
        case 6:
            history.display();
            break;
        case 7:
            cout<<"Current Location: "<<driverLocation<<endl;
            break;
        case 0:
            PrintLogout();
            return ;
        default:
            PrintError("Invalid choice.");
        }
    }
}

string selectRole()
{
    while(1)
    {
        cout<<"\n1. Admin\n";
        cout<<"2. User\n";
        cout<<"3. Driver\n";
        cout<<"0. Exit\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return "";
        cin.get();
        if(choice==1)
            return "Admin";
        if(choice==2)
            return "User";
        if(choice==3)
            return "Driver";
        if(choice==0)
            return "";
        PrintError("Invalid choice.");
    }
}

void signUpUser()
{
    string username;
    string password;
    string name;
    cout<<"\nUSER SIGN UP\n\n";
    cout<<"Enter username: ";
    getline(cin,username);
    if(userList.findIndex(username)!=-1)
    {
        PrintError("Username already exists.");
        return ;
    }
    cout<<"Enter password: ";
    password=readPassword();
    cout<<"Enter full name: ";
    getline(cin,name);
    if(userList.addUser(username,password,"User",name))
    {
        PrintSuccess("Account created. You can now sign in.");
        saveData();
    }
    else
        PrintError("Could not create account.");
}

void signIn(string role)
{
    string username;
    string password;
    cout<<"\nSIGN IN ("<<role<<")\n\n";
    cout<<"Enter username: ";
    getline(cin,username);
    cout<<"Enter password: ";
    password=readPassword();
    cout<<"\nAuthenticating...";
    User*user=userList.authenticate(username,password);
    if(user==NULL)
    {
        PrintError("Invalid username or password.");
        return ;
    }
    if(user->role!=role)
    {
        PrintError("This account is not a "+role+" account.");
        return ;
    }
    cout<<"\nLogin successful. Welcome, "<<user->name<<"!\n";
    if(role=="Admin")
        adminPanel();
    else if(role=="User")
        userPanel(user->username);
    else if(role=="Driver")
        driverPanel(user->username,user->name);
}

void userEntry()
{
    while(1)
    {
        PrintTitle("USER");
        cout<<"1. Sign In\n";
        cout<<"2. Sign Up\n";
        cout<<"3. Back\n";
        cout<<"Enter choice: ";
        int choice;
        if(!(cin>>choice))
            return ;
        cin.get();
        if(choice==1)
            signIn("User");
        else if(choice==2)
            signUpUser();
        else if(choice==3)
            return ;
        else
            PrintError("Invalid choice.");
    }
}

int main()
{
    SetConsoleOutputCP(65001);
    startProgram();

    while(1)
    {
        PrintMainBanner();
        string role=selectRole();
        if(role=="")
        {
            cout<<"Goodbye.\n";
            return 0;
        }
        if(role=="Admin")
            signIn("Admin");
        else if(role=="Driver")
            signIn("Driver");
        else if(role=="User")
            userEntry();
    }
    return 0;
}