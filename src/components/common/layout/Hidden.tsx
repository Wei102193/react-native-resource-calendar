import React from "react";
import {PropsWithChildren} from "react";

interface HiddenProps {
    isHidden: boolean;
}

const Hidden = ({isHidden, children}: PropsWithChildren<HiddenProps>) => {
    if (isHidden) {
        return null;
    }

    return (
        <>
            {children}
        </>
    );
};

export default Hidden;
