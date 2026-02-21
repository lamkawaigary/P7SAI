
import React, { createContext, useContext, useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { DatabaseProvider, useDatabase } from './DatabaseContext';
import { WalletProvider, useWallet } from './WalletContext';
import { OrderProvider, useOrder } from './OrderContext';
import { ChatProvider, useChat } from './ChatContext';
import { UserProvider, useUser } from './UserContext'; 
import { User } from '../types';
import { firebaseConfig } from '../firebaseConfig';

// Combine all context types
type AppContextType = ReturnType<typeof useAuth> & 
  ReturnType<typeof useDatabase> & 
  ReturnType<typeof useWallet> & 
  ReturnType<typeof useOrder> & 
  ReturnType<typeof useChat> & 
  ReturnType<typeof useUser> & {
    isDriverKYCOpen: boolean;
    setDriverKYCOpen: (isOpen: boolean) => void;
    resolveUser: (uid: string) => Promise<User | null>;
    loginClient: (phone: string, pass: string) => Promise<boolean>;
    googleApiKey: string;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppStateMerger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const database = useDatabase();
  const wallet = useWallet();
  const order = useOrder();
  const chat = useChat();
  const user = useUser();

  const [isDriverKYCOpen, setDriverKYCOpen] = useState(false);

  const resolveUser = async (uid: string): Promise<User | null> => {
    return database.users.find(u => u.id === uid) || null;
  };

  const loginClient = async (phone: string, pass: string) => {
    return auth.loginWithPassword(phone, pass);
  };

  const combinedContext: AppContextType = {
    ...auth,
    ...database,
    ...wallet,
    ...order,
    ...chat,
    ...user,
    isDriverKYCOpen,
    setDriverKYCOpen,
    resolveUser,
    loginClient,
    // Use the Firebase API Key for Google Maps as it belongs to the project and likely has Maps enabled.
    // process.env.API_KEY is reserved for Gemini AI and often lacks Maps permissions.
    googleApiKey: firebaseConfig.apiKey,
  };

  return (
    <AppContext.Provider value={combinedContext}>
      {children}
    </AppContext.Provider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <UserProvider>
          <WalletProvider>
            <OrderProvider>
              <ChatProvider>
                <AppStateMerger>
                  {children}
                </AppStateMerger>
              </ChatProvider>
            </OrderProvider>
          </WalletProvider>
        </UserProvider>
      </DatabaseProvider>
    </AuthProvider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
