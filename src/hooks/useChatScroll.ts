import React, { MutableRefObject } from 'react';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { NativeScrollEvent, FlatList } from 'react-native';
import debounce from 'lodash.debounce';

type Props = {
	chatManager: ChatManager;
	data: any[];
	listRef: MutableRefObject<FlatList>;
};
/**
 * update `distanceToBottom` and `distanceToTop` for ChatManager
 * will run `maybeLoad`
 * @returns onScroll function. pass this to FlatList component
 */
export function useChatScroll({ chatManager, data, listRef }: Props) {
	const isPending = React.useRef<boolean>(false);
	const firstLoad = React.useRef<boolean>(true);
	const ready = React.useRef<boolean>(false);

	/* -------------------------------------------------------------------------- */
	const maybeLoad = React.useCallback(
		debounce(async () => {
			if (!chatManager.shouldLoadTop && !chatManager.shouldLoadDown) return;
			if (isPending.current) return;
			isPending.current = true;

			/* -------------------------- check if should load -------------------------- */
			console.log(chatManager.distanceToTop, chatManager.distanceToBottom);
			console.log('checkLoad', chatManager.shouldLoadTop, chatManager.shouldLoadDown);
			await chatManager.maybeLoad();
			isPending.current = false;
		}, 50),
		[chatManager]
	);
	const onScroll = React.useCallback(
		(e) => {
			const { layoutMeasurement, contentOffset, contentSize } =
				e.nativeEvent as NativeScrollEvent;
			chatManager.distanceToBottom =
				contentSize.height - (layoutMeasurement.height + contentOffset.y);
			chatManager.distanceToTop = contentOffset.y;
			if (ready.current) maybeLoad();
		},
		[chatManager, maybeLoad]
	);

	/* ------------------------------ sticky scroll ----------------------------- */
	React.useLayoutEffect(() => {
		if (firstLoad.current) {
			firstLoad.current = false;
			return stickToBottom(false);
		}
		if (chatManager.isSticky) return stickToBottom(true);
	}, [data]);

	function stickToBottom(animated = false) {
		setTimeout(() => {
			listRef.current?.scrollToEnd({ animated: animated });
			ready.current = true;
		}, 100);
	}

	return { onScroll: onScroll };
}
