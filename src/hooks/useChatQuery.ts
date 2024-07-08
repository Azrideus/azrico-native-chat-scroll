import React from 'react';

import { ChatItem } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';

import { LoadDirection } from '../classes/ChatManager';
import { Virtuoso, VirtuosoHandle } from '@azrico/react-virtuoso';

const MID_MAX = Math.floor(Number.MAX_SAFE_INTEGER / 2);
/**
 * sets up the `loadFunction` for the `chatManager`
 * @param props
 * @returns currently active `ChatItem` array on the `chatManager`
 */
export function useChatQuery<T>({
	listRef,
	chatManager,
}: {
	chatManager: ChatManager<T>;
	listRef: React.MutableRefObject<VirtuosoHandle>;
}) {
	const isReady = React.useRef(false);
	const [currentItems, set_currentItems] = React.useState<ChatItem<T>[]>([]);

	const [firstItemIndex, set_firstItemIndex] = React.useState(MID_MAX);
	const [initialTopMostItemIndex, set_initialTopMostItemIndex] = React.useState(MID_MAX);
	const [isAtVeryTop, set_isAtVeryTop] = React.useState(false);
	const [isAtVeryBottom, set_isAtVeryBottom] = React.useState(false);

	const setItems = React.useCallback(
		(items: ChatItem<T>[]) => {
			let delta = 0;
			if (chatManager.lastChangeDirection === LoadDirection.UP) {
				delta = chatManager.lastCountChange;
			} else if (chatManager.lastChangeDirection === LoadDirection.DOWN) {
				// if (chatManager.lastCountChange > 0) delta = -chatManager.lastCountChange;
			}

			// console.log(`lastChangeDirection`, chatManager.lastChangeDirection);
			// console.log(`delta`, delta);
			// console.log(firstItemIndex, delta);

			if (delta != 0) {
				set_firstItemIndex((s) => {
					// console.log('set_firstItemIndex:', s - delta);
					return s - delta;
				});
			}

			//
			set_currentItems(items);
			set_isAtVeryBottom(chatManager.isAtVeryBottom);
			set_isAtVeryTop(chatManager.isAtVeryTop);
		},
		[chatManager]
	);

	React.useEffect(() => {
		chatManager.set_setItemsFunction(setItems);
	}, [chatManager, setItems]);
	React.useEffect(() => {
		chatManager.fetch_items(LoadDirection.UP).then((s) => (isReady.current = true));
	}, [chatManager]);

	const startReached = React.useCallback(async () => {
		if (!isReady.current) return [];
		const result = await chatManager.fetch_items(LoadDirection.UP);
		if (Array.isArray(result) && result.length > 0) return result;
		return null;
	}, [chatManager]);
	const endReached = React.useCallback(async () => {
		if (!isReady.current) return [];
		const result = await chatManager.fetch_items(LoadDirection.DOWN);
		if (Array.isArray(result) && result.length > 0) return result;
		return null;
	}, [chatManager]);
	const onScroll = React.useCallback(() => {
		listRef.current.getState((s) => {
			chatManager.distanceToTop = s.scrollTop;
			// console.log(`onScroll`, e, listRef);
		});
	}, [chatManager]);
	return {
		currentItems,
		startReached,
		endReached,
		initialTopMostItemIndex,
		firstItemIndex,
		onScroll,
		isAtVeryTop,
		isAtVeryBottom,
	};
}
