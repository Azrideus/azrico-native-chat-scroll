import React from 'react';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { NativeScrollEvent } from 'react-native';
import debounce from 'lodash.debounce';

type Props = {
	chatManager: ChatManager;
};
/**
 * update `distanceToBottom` and `distanceToTop` for ChatManager
 * will run `maybeLoad`
 * @returns onScroll function. pass this to FlatList component
 */
export function useLoadOnScroll({ chatManager }: Props) {
	const isPending = React.useRef<boolean>(false);
	const debouncedOnScroll = React.useCallback(
		debounce(async (e) => {
			console.log('debouncedOnScroll', e);
			if (isPending.current) return;
			isPending.current = true;

			/* -------------------------- check if should load -------------------------- */

			//await chatManager.maybeLoad();
			isPending.current = false;
		}, 1000),
		[chatManager]
	);

	return { onScroll: debouncedOnScroll };
}
