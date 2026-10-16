#ifndef SORTSEARCH_H
#define SORTSEARCH_H

#include<iostream>
#include<string>
#include"Bin.h"
using namespace std;

class SearchResult{
public:
    bool found;
    Bin bin;
    int steps;
    SearchResult()
    {
        found=false;
        steps=0;
    }
};

class SortSearch{
public:
    static void mergeSort(Bin arr[],int left,int right,string key,bool descending,Bin temp[])
    {
        if(left>=right)
            return ;
        int mid=(left+right)/2;
        mergeSort(arr,left,mid,key,descending,temp);
        mergeSort(arr,mid+1,right,key,descending,temp);
        merge(arr,left,mid,right,key,descending,temp);
    }
    static double getKey(Bin b,string key)
    {
        if(key=="fill")
            return b.fill;
        if(key=="rate")
            return b.rate;
        if(key=="priority")
            return b.priority;
        return 0;
    }
    static void merge(Bin arr[],int left,int mid,int right,string key,bool descending,Bin temp[])
    {
        int i=left;
        int j=mid+1;
        int k=left;
        while(i<=mid && j<=right)
        {
            double a=getKey(arr[i],key);
            double b=getKey(arr[j],key);
            bool takeLeft;
            if(descending)
                takeLeft=a>=b;
            else
                takeLeft=a<=b;
            if(takeLeft)
                temp[k++]=arr[i++];
            else
                temp[k++]=arr[j++];
        }
        while(i<=mid)
            temp[k++]=arr[i++];
        while(j<=right)
            temp[k++]=arr[j++];
        for(int x=left;x<=right;x++)
            arr[x]=temp[x];
    }
    static void sortBins(Bin arr[],int n,string key,bool descending)
    {
        if(key=="id")
        {
            sortBinsById(arr,n);
            return ;
        }
        Bin temp[100];
        mergeSort(arr,0,n-1,key,descending,temp);
    }
    static bool idLess(Bin a,Bin b)
    {
        return a.id<b.id;
    }
    static void mergeById(Bin arr[],int left,int mid,int right,Bin temp[])
    {
        int i=left;
        int j=mid+1;
        int k=left;
        while(i<=mid && j<=right)
        {
            if(idLess(arr[i],arr[j]))
                temp[k++]=arr[i++];
            else
                temp[k++]=arr[j++];
        }
        while(i<=mid)
            temp[k++]=arr[i++];
        while(j<=right)
            temp[k++]=arr[j++];
        for(int x=left;x<=right;x++)
            arr[x]=temp[x];
    }
    static void mergeSortById(Bin arr[],int left,int right,Bin temp[])
    {
        if(left>=right)
            return ;
        int mid=(left+right)/2;
        mergeSortById(arr,left,mid,temp);
        mergeSortById(arr,mid+1,right,temp);
        mergeById(arr,left,mid,right,temp);
    }
    static void sortBinsById(Bin arr[],int n)
    {
        Bin temp[100];
        mergeSortById(arr,0,n-1,temp);
    }
    static SearchResult binarySearch(Bin arr[],int n,string id)
    {
        SearchResult result;
        int low=0;
        int high=n-1;
        while(low<=high)
        {
            result.steps++;
            int mid=(low+high)/2;
            if(arr[mid].id==id)
            {
                result.found=true;
                result.bin=arr[mid];
                return result;
            }
            else if(arr[mid].id<id)
                low=mid+1;
            else
                high=mid-1;
        }
        return result;
    }
};

#endif