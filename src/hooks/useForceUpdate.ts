import React from 'react';

/**
 *  a function that when called, will remount the current component
 * @returns [updateKey,forceUpdate]
 */
export function useForceUpdate() {
	return React.useReducer((x) => (x + 1) % 100, 0);
}