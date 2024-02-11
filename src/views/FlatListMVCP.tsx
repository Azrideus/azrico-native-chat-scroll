import { Modify } from '@azrico/types';
import React from 'react';
import {
	FlatList,
	FlatListProps,
	LayoutChangeEvent,
	NativeScrollEvent,
} from 'react-native';
import { ChatItem } from '../classes/ChatItem';
import ChatManager, { ChangeOperation } from '../classes/ChatManager';

type FlatListMVCPProps = Modify<
	FlatListProps<ChatItem>,
	{ chatManager: ChatManager; data: ChatItem[] }
>;

/**
 * maintainVisibleContentPosition support for web and mobile
 * @param props
 */
export function ScrollViewMVCP(props: FlatListMVCPProps) {
	const { chatManager, ...restprops } = props;
	const listRef = React.useRef<FlatList>();

	const [useData, set_useData] = React.useRef([]);

	/* -------------------------------------------------------------------------- */
	const firstLoad = React.useRef<boolean>(true);

	const lastOffset = React.useRef<number>(0);

	const currentContentHeight = React.useRef<number>(0);

	async function onScroll(e: any) {
		/* ---------------------------- update distances ---------------------------- */
		const { layoutMeasurement, contentOffset, contentSize } =
			e.nativeEvent as NativeScrollEvent;

		lastOffset.current = contentOffset.y;

		chatManager.distanceToBottom =
			contentSize.height - (layoutMeasurement.height + contentOffset.y);
		chatManager.distanceToTop = contentOffset.y;

		if (props.onScroll) props.onScroll(e);
	}
	const onContentSizeChange = (h, w) => {
		currentContentHeight.current = h;
	};
	/* -------------------------------------------------------------------------- */
	/*            prevent the scroller from jumping when you add items            */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (chatManager.lastOperation === ChangeOperation.NONE) return;

		console.log('data changed.', chatManager.referenceTop, props.data);

		/* ------------------------ first load, stickToBottom ----------------------- */
		if (chatManager.lastDBLoad > 0 && firstLoad.current) {
			firstLoad.current = false;
			return stickToBottom(false);
		}
		return;

		/* ------------------- reference is not set, stickToBottom ------------------ */
		if (
			!Array.isArray(props.data) ||
			props.data.length === 0 ||
			Number.isNaN(chatManager.referenceLastTop)
		) {
			return stickToBottom(false);
		}
		/* ---------------------------- sticky to bottom ---------------------------- */
		if (chatManager.isSticky) {
			return stickToBottom(false);
		}

		/* --------------------- keep same distance to reference -------------------- */
		// if (distanceToTop.current) {
		// 	listRef.current?.scrollToOffset({ animated: false, offset: distanceToTop.current });
		// }
		console.log('lastTop:', chatManager.referenceLastTop);
		console.log('referenceTop:', chatManager.referenceTop);
		const jumpDistance = chatManager.referenceTop - chatManager.referenceLastTop;
		const newOffset = lastOffset.current + jumpDistance;

		console.log('jumpDistance:', jumpDistance);
		listRef.current?.scrollToOffset({ animated: false, offset: newOffset });
	}, [props.data]);

	function stickToBottom(smooth = true) {
		listRef.current?.scrollToOffset({ offset: 9999 });
		//setTimeout(() => {
		//	listRef.current?.scrollToEnd({ animated: smooth });
		//}, 100);
	}

	return (
		<FlatList
			{...restprops}
			scrollEventThrottle={300}
			data={props.data}
			onContentSizeChange={onContentSizeChange}
			onScroll={onScroll}
			ref={listRef as any}
			maintainVisibleContentPosition={undefined}
		/>
	);
}
export default ScrollViewMVCP;
