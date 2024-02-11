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
	const lastOffset = React.useRef<number>(0);
	const lastHeight = React.useRef<number>(0);
	const stickToBottom = React.useRef<string>('');

	const [useData, set_useData] = React.useState<ChatItem[]>([]);

	React.useLayoutEffect(() => {
		if (useData.length === 0) {
			stickToBottom.current = 'first';
		} else if (chatManager.isSticky) {
			stickToBottom.current = 'animated';
		}

		chatManager.update_reference(useData);
		set_useData(props.data);
	}, [props.data]);

	async function onContentSizeChange(h, w) {
		console.log('onContentSizeChange');
		setTimeout(() => {
			if (stickToBottom.current) {
				switch (stickToBottom.current) {
					case 'animated':
						listRef.current?.scrollToEnd({
							animated: true,
						});
						break;

					case 'first':
						listRef.current?.scrollToOffset({
							animated: false,
							offset: h,
						});
						break;
				}
				stickToBottom.current = '';
				return;
			}
			const jumpDistance = chatManager.referenceTop - chatManager.referenceLastTop;
			const newOffset = lastOffset.current + jumpDistance;
			// console.log('referenceTop:', chatManager.referenceTop);
			// console.log('referenceLastTop:', chatManager.referenceLastTop);
			// console.log('lastOffset:', lastOffset.current);
			// console.log('jumpDistance:', jumpDistance);
			listRef.current?.scrollToOffset({ animated: false, offset: newOffset });
		}, 100);
	}

	/* -------------------------------------------------------------------------- */

	async function onScroll(e: any) {
		/* ---------------------------- update distances ---------------------------- */
		const { layoutMeasurement, contentOffset, contentSize } =
			e.nativeEvent as NativeScrollEvent;

		lastOffset.current = contentOffset.y;

		chatManager.distanceToBottom =
			contentSize.height - (layoutMeasurement.height + contentOffset.y);
		chatManager.distanceToTop = contentOffset.y;

		// if (props.onScroll) props.onScroll(e);
	}

	/* -------------------------------------------------------------------------- */
	/*            prevent the scroller from jumping when you add items            */
	/* -------------------------------------------------------------------------- */

	return (
		<FlatList
			{...restprops}
			scrollEventThrottle={300}
			onScroll={onScroll}
			onContentSizeChange={onContentSizeChange}
			data={useData}
			ref={listRef as any}
			maintainVisibleContentPosition={undefined}
		/>
	);
}
export default ScrollViewMVCP;
