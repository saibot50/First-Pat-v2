import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

export interface ApplicationSummary {
    id: string;
    title: string;
    stage: string;
    updatedAt: Date | null;
    createdAt: Date | null;
}

export interface ApplicationData extends ApplicationSummary {
    ideaData?: any;
    pprData?: any;
    patentData?: any;
    userId: string;
}

// Collection References
const getUsersCollection = () => collection(db, 'users');
const getUserAppsCollection = (userId: string) => collection(db, 'users', userId, 'applications');

export const createApplication = async (userId: string, title: string): Promise<string> => {
    const appsRef = getUserAppsCollection(userId);
    const newAppRef = doc(appsRef); // Generate ID

    const appData = {
        id: newAppRef.id,
        userId,
        title,
        stage: 'AGREEMENT', // Initial stage
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ideaData: {},
        pprData: {},
        patentData: {}
    };

    await setDoc(newAppRef, appData);
    return newAppRef.id;
};

export const getUserApplications = async (userId: string): Promise<ApplicationSummary[]> => {
    const appsRef = getUserAppsCollection(userId);
    const q = query(appsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title || 'Untitled Project',
            stage: data.stage || 'AGREEMENT',
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null
        };
    });
};

export const getApplication = async (userId: string, appId: string): Promise<ApplicationData | null> => {
    const appRef = doc(db, 'users', userId, 'applications', appId);
    const snapshot = await getDoc(appRef);

    if (snapshot.exists()) {
        const data = snapshot.data();
        return {
            ...data,
            id: snapshot.id,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null
        } as ApplicationData;
    }
    return null;
};

export const saveApplication = async (userId: string, appId: string, data: Partial<ApplicationData>) => {
    const appRef = doc(db, 'users', userId, 'applications', appId);

    // Remove undefined values to prevent Firestore errors
    const updates = JSON.parse(JSON.stringify({
        ...data,
        updatedAt: serverTimestamp()
    }));

    await updateDoc(appRef, updates);
};
