import {
    doc,
    getDoc
} from "firebase/firestore";

import { db } from "./firebaseConfig";



export const getUserData = async(uid)=>{


    const userRef =
        doc(db,"users",uid);


    const snapshot =
        await getDoc(userRef);



    if(snapshot.exists()){

        return snapshot.data();

    }


    return null;

};