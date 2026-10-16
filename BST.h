#ifndef BST_H
#define BST_H

#include<iostream>
#include<string>
#include"UI.h"
using namespace std;

class BSTNode{
public:
    int id;
    string name;
    BSTNode*left;
    BSTNode*right;
    BSTNode(int i,string n)
    {
        id=i;
        name=n;
        left=NULL;
        right=NULL;
    }
};

class BST{
public:
    BSTNode*root;
    BST()
    {
        root=NULL;
    }
    BSTNode*insertNode(BSTNode*node,int id,string name)
    {
        if(node==NULL)
            return new BSTNode(id,name);
        if(id<node->id)
            node->left=insertNode(node->left,id,name);
        else if(id>node->id)
            node->right=insertNode(node->right,id,name);
        return node;
    }
    void insert(int id,string name)
    {
        root=insertNode(root,id,name);
    }
    BSTNode*searchNode(BSTNode*node,int id)
    {
        if(node==NULL)
            return NULL;
        if(id==node->id)
            return node;
        if(id<node->id)
            return searchNode(node->left,id);
        return searchNode(node->right,id);
    }
    bool search(int id)
    {
        BSTNode*found=searchNode(root,id);
        if(found==NULL)
            return false;
        PrintSuccess("Location Found: "+to_string(found->id)+" - "+found->name);
        return true;
    }
    BSTNode*findMin(BSTNode*node)
    {
        while(node->left!=NULL)
            node=node->left;
        return node;
    }
    BSTNode*deleteNode(BSTNode*node,int id)
    {
        if(node==NULL)
            return NULL;
        if(id<node->id)
            node->left=deleteNode(node->left,id);
        else if(id>node->id)
            node->right=deleteNode(node->right,id);
        else
        {
            if(node->left==NULL)
            {
                BSTNode*temp=node->right;
                delete node;
                return temp;
            }
            if(node->right==NULL)
            {
                BSTNode*temp=node->left;
                delete node;
                return temp;
            }
            BSTNode*successor=findMin(node->right);
            node->id=successor->id;
            node->name=successor->name;
            node->right=deleteNode(node->right,successor->id);
        }
        return node;
    }
    bool deleteLocation(int id)
    {
        if(searchNode(root,id)==NULL)
            return false;
        root=deleteNode(root,id);
        return true;
    }
    void inorder(BSTNode*node)
    {
        if(node==NULL)
            return ;
        inorder(node->left);
        cout<<node->id<<" - "<<node->name<<endl;
        inorder(node->right);
    }
    void preorder(BSTNode*node)
    {
        if(node==NULL)
            return ;
        cout<<node->id<<" - "<<node->name<<endl;
        preorder(node->left);
        preorder(node->right);
    }
    void postorder(BSTNode*node)
    {
        if(node==NULL)
            return ;
        postorder(node->left);
        postorder(node->right);
        cout<<node->id<<" - "<<node->name<<endl;
    }
    string findLocationName(int id)
    {
        BSTNode*found=searchNode(root,id);
        if(found==NULL)
            return "";
        return found->name;
    }
    int countNodes(BSTNode*node)
    {
        if(node==NULL)
            return 0;
        return 1+countNodes(node->left)+countNodes(node->right);
    }
    int totalLocations()
    {
        return countNodes(root);
    }
    void showInorder()
    {
        PrintTitle("LOCATIONS (SORTED BY ID)");
        inorder(root);
    }
    void showPreorder()
    {
        PrintTitle("LOCATIONS (ROOT FIRST)");
        preorder(root);
    }
    void showPostorder()
    {
        PrintTitle("LOCATIONS (LEAVES FIRST)");
        postorder(root);
    }
};

#endif