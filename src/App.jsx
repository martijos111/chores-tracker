import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch,
    Timestamp
} from 'firebase/firestore';

// --- App Configuration ---
// Set this to true to require a password, or false to log in on click.
const PASSWORD_PROTECTION_ENABLED = false;


// --- SVG Icons ---
// Using inline SVGs to avoid external dependencies.
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


// --- Firebase Configuration ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAlCJbx2QZbAIOPRud4ej2vPVb4mj5A7EA",
    authDomain: "chore-tracker-4871d.firebaseapp.com",
    projectId: "chore-tracker-4871d",
    storageBucket: "chore-tracker-4871d.firebasestorage.app",
    messagingSenderId: "1071399785062",
    appId: "1:1071399785062:web:355afcaef750be65f193a7",
    measurementId: "G-N3Q3GBDLBB"
};

// --- Initialize Firebase ---
// This setup allows the app to work within different environments.
let app, auth, db;
try {
    const config = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization error:", e);
}

// --- Helper Functions ---
const getNextDueDate = (dueDate, recurringType, recurringDays) => {
    const currentDueDate = dueDate.toDate();
    let nextDate = new Date(currentDueDate);
    
    if (recurringType === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
    } else if (recurringType === 'weekly') {
        // This logic finds the next scheduled day of the week.
        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayIndex = currentDueDate.getDay();
        let daysToAdd = 1;

        // Start checking from the day after the current due date
        for (let i = 1; i <= 7; i++) {
            const potentialDayIndex = (currentDayIndex + i) % 7;
            if (recurringDays.includes(dayMap[potentialDayIndex])) {
                daysToAdd = i;
                break;
            }
        }
        nextDate.setDate(nextDate.getDate() + daysToAdd);
    } else if (recurringType === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return Timestamp.fromDate(nextDate);
};


// --- Components ---

// 1. Login Screen Component
const LoginScreen = ({ setUser }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    const handleLogin = () => {
        if (password === 'password123') {
            setUser(selectedUser);
            setError('');
        } else {
            setError('Incorrect password. Please try again.');
        }
    };

    const handleUserSelect = (user) => {
        if (PASSWORD_PROTECTION_ENABLED) {
            setSelectedUser(user);
            setError('');
            setPassword('');
        } else {
            setUser(user); // Bypass password check if disabled
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Chore Tracker</h1>
                <p className="text-center text-gray-500 mb-8">Please select your profile.</p>

                <div className="flex justify-center space-x-4 mb-6">
                    <button
                        onClick={() => handleUserSelect('Mom')}
                        className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 ${selectedUser === 'Mom' ? 'bg-pink-500 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-700'}`}
                    >
                        Mom
                    </button>
                    <button
                        onClick={() => handleUserSelect('Pinky')}
                        className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 ${selectedUser === 'Pinky' ? 'bg-purple-500 text-white shadow-md scale-105' : 'bg-gray-200 text-gray-700'}`}
                    >
                        Pinky
                    </button>
                </div>

                {selectedUser && PASSWORD_PROTECTION_ENABLED && (
                    <div className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            placeholder="Enter password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleLogin}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Login as {selectedUser}
                        </button>
                    </div>
                )}
                
                {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
            </div>
        </div>
    );
};

// 2. Add/Edit Chore Modal Component
const ChoreModal = ({ setShowModal, user }) => {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [choreType, setChoreType] = useState('one-time');
    const [recurringType, setRecurringType] = useState('weekly');
    const [recurringDays, setRecurringDays] = useState([]);

    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const handleDayToggle = (day) => {
        setRecurringDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !dueDate) {
            alert('Please fill in the chore title and due date.');
            return;
        }

        const selectedDateTime = new Date(`${dueDate}T${dueTime || '00:00:00'}`);
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

        if (selectedDateTime < oneHourFromNow) {
            alert("Due date and time must be at least one hour from now.");
            return;
        }

        const choreData = {
            title,
            dueDate: Timestamp.fromDate(new Date(dueDate + 'T00:00:00')), // Set to start of day
            dueTime,
            status: 'pending', // pending, waiting_for_approval, approved
            createdAt: Timestamp.now(),
            completedAt: null,
            submittedAt: null,
            createdBy: user,
            isRecurring: choreType === 'repeating',
            recurringType: choreType === 'repeating' ? recurringType : null,
            recurringDays: choreType === 'repeating' && recurringType === 'weekly' ? recurringDays : [],
            hiddenFrom: [], // Add this field to track who has hidden the chore
        };

        try {
            await addDoc(collection(db, 'chores'), choreData);
            setShowModal(false);
        } catch (error) {
            console.error("Error adding chore: ", error);
            alert("Failed to add chore. Please try again.");
        }
    };
    
    // Get today's date in YYYY-MM-DD format for the input min attribute
    const todayString = new Date().toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Add a New Chore</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Chore Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Due Date</label>
                            <input 
                                type="date" 
                                value={dueDate} 
                                onChange={(e) => setDueDate(e.target.value)} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
                                required 
                                min={todayString}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Due Time (Optional)</label>
                            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Chore Type</label>
                        <div className="flex space-x-4 mt-2">
                            <button type="button" onClick={() => setChoreType('one-time')} className={`px-4 py-2 rounded-md text-sm font-medium ${choreType === 'one-time' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>One-Time</button>
                            <button type="button" onClick={() => setChoreType('repeating')} className={`px-4 py-2 rounded-md text-sm font-medium ${choreType === 'repeating' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Repeating</button>
                        </div>
                    </div>
                    {choreType === 'repeating' && (
                        <div className="p-4 bg-gray-50 rounded-lg space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Repeats</label>
                                <select value={recurringType} onChange={(e) => setRecurringType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            {recurringType === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">On these days</label>
                                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                        {weekDays.map(day => (
                                            <button type="button" key={day} onClick={() => handleDayToggle(day)} className={`p-2 text-xs rounded-md ${recurringDays.includes(day) ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>{day.slice(0, 3)}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Chore</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 3. Chore Item Component
const ChoreItem = ({ chore, user }) => {
    const { id, title, dueDate, dueTime, status, isRecurring, recurringType, recurringDays, completedAt, submittedAt } = chore;

    const isOverdue = dueDate && dueDate.toDate() < new Date() && status === 'pending';

    const formattedDate = dueDate ? dueDate.toDate().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'No due date';

    const formattedCompletedDate = completedAt ? completedAt.toDate().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
    }) : '';

    const formattedSubmittedDate = submittedAt ? submittedAt.toDate().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
    }) : '';

    const statusStyles = {
        pending: 'border-l-4 border-blue-500',
        waiting_for_approval: 'border-l-4 border-yellow-500 bg-yellow-50',
        approved: 'border-l-4 border-green-500 bg-green-50',
    };

    const overdueStyles = isOverdue ? 'opacity-60 border-l-4 border-red-500' : '';

    // --- Action Handlers ---
    const handleMarkComplete = async () => {
        const choreRef = doc(db, 'chores', id);
        await updateDoc(choreRef, { 
            status: 'waiting_for_approval',
            submittedAt: Timestamp.now() 
        });
    };

    const handleApprove = async () => {
        const batch = writeBatch(db);
        const choreRef = doc(db, 'chores', id);
        
        // Mark current chore as approved and set completion date
        batch.update(choreRef, { status: 'approved', completedAt: Timestamp.now() });

        // If it's a recurring chore, create the next one
        if (isRecurring) {
            const nextDueDate = getNextDueDate(dueDate, recurringType, recurringDays);
            const newChoreData = {
                ...chore,
                dueDate: nextDueDate,
                status: 'pending',
                createdAt: Timestamp.now(),
                completedAt: null, // Reset completion date for the new chore
                submittedAt: null, // Reset submission date for the new chore
                hiddenFrom: [], // Ensure new recurring chore is visible to everyone
            };
            delete newChoreData.id; // Remove old ID
            const newChoreRef = collection(db, 'chores');
            batch.set(doc(newChoreRef), newChoreData);
        }

        await batch.commit();
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            await deleteDoc(doc(db, 'chores', id));
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-opacity ${statusStyles[status]} ${overdueStyles}`}>
            <div className="flex-grow">
                <p className="font-bold text-gray-800">{title}</p>
                <p className="text-sm text-gray-500">
                    {status === 'approved' && formattedCompletedDate 
                        ? `Completed: ${formattedCompletedDate}` 
                        : status === 'waiting_for_approval' && formattedSubmittedDate
                            ? `Submitted: ${formattedSubmittedDate}`
                            : `Due: ${formattedDate} ${dueTime && `at ${dueTime}`}`
                    }
                </p>
            </div>
            <div className="flex items-center justify-end space-x-2">
                {user === 'Pinky' && status === 'pending' && (
                    <button onClick={handleMarkComplete} className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600 flex items-center gap-1">
                        <CheckCircleIcon />
                        <span>Done</span>
                    </button>
                )}
                {user === 'Mom' && status === 'waiting_for_approval' && (
                    <button onClick={handleApprove} className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600 flex items-center gap-1">
                        <CheckCircleIcon />
                        <span>Approve</span>
                    </button>
                )}
                {user === 'Mom' && (
                    <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-full">
                        <TrashIcon />
                    </button>
                )}
            </div>
        </div>
    );
};

// 4. Chore List Component
const ChoreList = ({ title, chores, user, color }) => {
    if (chores.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className={`text-xl font-bold mb-4 pb-2 border-b-2 ${color}`}>{title}</h2>
            <div className="space-y-3">
                {chores.map(chore => <ChoreItem key={chore.id} chore={chore} user={user} />)}
            </div>
        </div>
    );
};

// 5. Main Dashboard Component
const Dashboard = ({ user, setUser }) => {
    const [chores, setChores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Real-time listener for chores
        const q = query(collection(db, 'chores'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const choresData = [];
            querySnapshot.forEach((doc) => {
                choresData.push({ id: doc.id, ...doc.data() });
            });
            // Sort chores by due date, handling cases where dueDate might be missing
            choresData.sort((a, b) => {
                const aDate = a.dueDate ? a.dueDate.toMillis() : 0;
                const bDate = b.dueDate ? b.dueDate.toMillis() : 0;
                return aDate - bDate;
            });
            setChores(choresData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chores:", error);
            setLoading(false);
        });
        
        // Cleanup listener on component unmount
        return () => unsubscribe();
    }, []);

    const visibleChores = useMemo(() => {
        return chores.filter(chore => !chore.hiddenFrom || !chore.hiddenFrom.includes(user));
    }, [chores, user]);

    const { pendingChores, waitingForApprovalChores, approvedChores } = useMemo(() => {
        return {
            pendingChores: visibleChores.filter(c => c.status === 'pending'),
            waitingForApprovalChores: visibleChores.filter(c => c.status === 'waiting_for_approval'),
            approvedChores: visibleChores.filter(c => c.status === 'approved'),
        };
    }, [visibleChores]);

    const handleRemoveApproved = async () => {
        if (approvedChores.length === 0) {
            alert("No approved chores to remove.");
            return;
        }
        if (window.confirm("Are you sure you want to remove all approved chores from your view?")) {
            const batch = writeBatch(db);
            approvedChores.forEach(chore => {
                const choreRef = doc(db, 'chores', chore.id);
                const newHiddenFrom = chore.hiddenFrom ? [...chore.hiddenFrom, user] : [user];
                batch.update(choreRef, { hiddenFrom: newHiddenFrom });
            });
            await batch.commit();
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user}!</h1>
                        <p className="text-gray-500">Here are your chores for today.</p>
                    </div>
                    <button onClick={() => setUser(null)} className="text-sm font-medium text-blue-600 hover:underline">
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-6">
                {loading ? (
                    <p>Loading chores...</p>
                ) : (
                    <>
                        <ChoreList title="To-Do" chores={pendingChores} user={user} color="border-blue-500" />
                        <ChoreList title="Waiting for Approval" chores={waitingForApprovalChores} user={user} color="border-yellow-500" />
                        <ChoreList title="Approved & Done!" chores={approvedChores} user={user} color="border-green-500" />
                        
                        {visibleChores.length === 0 && (
                            <div className="text-center py-16">
                                <h3 className="text-xl font-semibold text-gray-700">All caught up!</h3>
                                <p className="text-gray-500 mt-2">
                                    {user === 'Mom' ? "Add a new chore to get started." : "No chores assigned at the moment."}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {approvedChores.length > 0 && (
                    <div className="mt-8 flex justify-center">
                        <button onClick={handleRemoveApproved} className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 flex items-center gap-2">
                            <TrashIcon />
                            Remove All Approved
                        </button>
                    </div>
                )}
            </main>

            {user === 'Mom' && (
                <button
                    onClick={() => setShowModal(true)}
                    className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform hover:scale-110"
                    aria-label="Add new chore"
                >
                    <PlusIcon />
                </button>
            )}

            {showModal && <ChoreModal setShowModal={setShowModal} user={user} />}
        </div>
    );
};

// 6. Main App Component (Root)
export default function App() {
    const [user, setUser] = useState(null); // null, 'Mom', or 'Pinky'
    const [authReady, setAuthReady] = useState(false);

    // This effect handles the initial authentication with Firebase.
    // It will sign in the user anonymously to satisfy security rules.
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Check if a special token is provided by the environment (for secure contexts)
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (token) {
                    await signInWithCustomToken(auth, token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Anonymous sign-in failed:", error);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                console.log("Firebase Auth ready. User UID:", firebaseUser.uid);
                setAuthReady(true);
            }
        });

        initAuth();
        return () => unsubscribe(); // Cleanup subscription
    }, []);

    // Render a loading state until Firebase Auth is ready.
    // This prevents Firestore permission errors on initial load.
    if (!authReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-lg font-semibold text-gray-600">Connecting to service...</p>
            </div>
        );
    }
    
    // Once auth is ready, show the Login screen or the Dashboard.
    if (!user) {
        return <LoginScreen setUser={setUser} />;
    }

    return <Dashboard user={user} setUser={setUser} />;
}
