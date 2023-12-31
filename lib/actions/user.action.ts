"use server";

import { FilterQuery, SortOrder } from "mongoose";
import { revalidatePath } from "next/cache";


import User from "../models/user.model";

import { connectToDB } from "../mongoose";
import Thread from "../models/thread.model";


interface Params {
  userId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
}

export async function updateUser({
  userId,
  bio,
  name,
  path,
  username,
  image,
}: Params): Promise<void> {
  try {
    connectToDB();

    await User.findOneAndUpdate(
      { id: userId },
      {
        username: username.toLowerCase(),
        name,
        bio,
        image,
        onboarded: true,
      },
      { upsert: true }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update user: ${error.message}`);
  }
}

export async function fetchUser(userId:string){
  try {
    connectToDB()

    return await User.findOne({id:userId})
  } catch (error:any) {
    throw new Error(`Failed to fetch user ${error.message}`)
  }
}

export async function fetchUserPost(userId:string) {
  try {
    connectToDB()

    // find all thread
    const threads = await User.findOne({id:userId})
    .populate({
      path:'threads',
      model:Thread,
      populate:{
        path:'children',
        model:Thread,
        populate:{
          path:'author',
          model:User,
          select:'name image id'
        }
      }
    })
    return threads
  } catch (error) {
    throw new Error(`Failed to fetch user post`)
  }
}

export async function fetchUsers({
  userId,
  searchString="",
  pageNumber=1,
  pageSize=20,
  sortBy="desc"
}:{
  userId:string;
  searchString?:string;
  pageNumber?:number;
  pageSize?:number;
  sortBy?:SortOrder;
})
{
  try {
    connectToDB()

    const skipAmount = (pageNumber-1) * pageSize;
    const regex = new RegExp(searchString,"i")
    const query:FilterQuery<typeof User>={
      id:{$ne:userId}
    }
    if(searchString.trim() !=='')
    {
      query.$or=[
        {username:{$regex:regex}},
        {name:{$regex:regex}}

      ]
    }

    const sortOptions = {createAt:sortBy}
    const userQuery=User.find(query)
    .sort(sortOptions)
    .skip(skipAmount)
    .limit(pageSize)

    const totalUserCount =await User.countDocuments(query)

    const users = await userQuery.exec()

    const isNext = totalUserCount > skipAmount + users.length
    return {users,isNext}
  } catch (error) {
    throw new Error(``)
  }
}