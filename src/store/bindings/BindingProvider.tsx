// store/BindingProvider.tsx
import React, {createContext, useContext} from 'react';
import {CalendarStoreBinding} from './calendarStoreBinding';
import {zustandBinding} from "./ZustandBinding";

const BindingCtx = createContext<CalendarStoreBinding | null>(null);

export const useCalendarBinding = (): CalendarStoreBinding => {
    const ctx = useContext(BindingCtx);
    if (!ctx) throw new Error('useCalendarBinding must be used within <CalendarBindingProvider>');
    return ctx;
};

export const CalendarBindingProvider: React.FC<{
    binding?: CalendarStoreBinding; // optional override
    children: React.ReactNode;
}> = ({binding, children}) => {
    const active = binding ?? zustandBinding;
    const StoreProvider = active.Provider; // mounts the store
    return (
        <BindingCtx.Provider value={active}>
            <StoreProvider>{children}</StoreProvider>
        </BindingCtx.Provider>
    );
};
