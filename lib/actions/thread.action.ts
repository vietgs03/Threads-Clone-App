'use server'


import { revalidatePath } from "next/cache";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

interface Params {
    text:string,
    author:string,
    communityId:string| null,
    path:string,
}


export async function createThread({
    text,author,communityId,path
}:Params) {
    try {
        connectToDB()
        const createdThread = await Thread.create({
            text,
            author,
            community:null
        })
    
        //update user model
    
        await User.findByIdAndUpdate(author,{
            $push:{
                threads:createdThread._id
            }
        })
    } catch (error) {
        throw new Error(`khong the create thread `)
    }

    revalidatePath(path)

}

export async function fetchPosts(pageNumber:1,pageSize=20) {
    connectToDB()

    // calculate the number of posts to skip
    const skip = (pageNumber-1)*pageSize


    // fetch post that have no parent (top-level thread...)
    const postQuery = Thread.find({
        parentId:{$in:[null,undefined]}
    })
    .sort({createAt:'desc'})
    .skip(skip)
    .limit(pageSize)
    .populate({path:'author',model:User})
    .populate({
        path:'children',
        populate:{
            path:'author',
            model:User,
            select:"_id name parentId image"
        }
    })
    const totalPostsCount = await Thread.countDocuments({ parentId:{$in:[null,undefined]} })
    const posts = await postQuery.exec()
    
    const isNext = totalPostsCount>skip +posts.length

    return {posts,isNext}
}

export async function fetchThreadById(id:string)
{
    connectToDB()

    try {

        const thread = await Thread.findById(id)
        .populate({
            path:'author',
            model:User,
            select:'_id id name image'
        })
        .populate({
            path:'children',
            populate:[{
                path:'author',
                model:User,
                select:'_id id name parentId image'
            },
            {
                path:'children',
                model:Thread,
                populate:{
                    path:'author',
                    model:User,
                    select:'_id id name parentId image'
                }
            }
        
        ]
        }).exec()
        return thread
    } catch (error) {
        throw new Error(`Error fetching thread`)
    }
}