import React from 'react';
import { UIDHelper, useForceUpdate } from '../classes/HelperFunctions';
import { ChatItem, ItemData } from '../classes/ChatItem';
import ChatManager, {
	LoadFunctionType, 
} from '../classes/ChatManager';
import { useChatManager } from '../hooks/useChatManager';
import {
	QueryClient,
	QueryClientProvider, 
} from '@tanstack/react-query';
import { ActivityIndicator, Text, View } from 'react-native';
import { FlatList } from 'react-native-bidirectional-infinite-scroll';
import { useChatQuery } from '../hooks';

type ItemPropsType = any;
type VirtualScrollerProps = {
	loadFunction: LoadFunctionType;
	ItemRender: React.ElementType<ItemRenderProps>;
	/* -------------------------------------------------------------------------- */
	newItems?: ItemData[];
	WrapperContent?: React.ElementType<any>;
	BottomContent?: React.ElementType<any>;
	TopContent?: React.ElementType<any>;
	managerRef?: React.MutableRefObject<ChatManager | undefined>;
	className?: string;
	itemClassName?: string;
	innerClassName?: string;
	itemProps?: ItemPropsType;
	debug?: boolean;
};

const queryClient = new QueryClient();
/**
 * Advanced Virtual scrolling
 * use the debug prop to enable logs
 * @param props
 */
export function VirtualChatList(props: VirtualScrollerProps) {
	const queryKey = React.useMemo(() => UIDHelper.nextid(), []);
	const chatManager = useChatManager({
		managerRef: props.managerRef,
		loadFunction: props.loadFunction,
		debug: props.debug,
	});

	const { currentItems, loadMoreOlderMessages, loadMoreRecentMessages } = useChatQuery({
		chatManager: chatManager,
	});

	return (
		<QueryClientProvider client={queryClient}>
			<FlatList
				inverted
				enableAutoscrollToTop={true} // optional | default - false
				data={currentItems}
				renderItem={MessageBubble as any}
				keyExtractor={(item: ChatItem) => item.key}
				/* -------------------------------------------------------------------------- */
				onStartReached={loadMoreOlderMessages}
				onEndReached={loadMoreRecentMessages}
				/* -------------------------------------------------------------------------- */
				showDefaultLoadingIndicators={true} // optional
				onStartReachedThreshold={10} // optional
				onEndReachedThreshold={10} // optional
				activityIndicatorColor={'black'} // optional

				// You can use any other prop on react-native's FlatList
			/>
		</QueryClientProvider>
	);
}
type Props = {
	item: ChatItem;
};
const MessageBubble: React.FC<Props> = ({ item }) => {
	return (
		<View>
			<Text>{'test'}</Text>
		</View>
	);
};
type RowRenderProps = {
	item: ChatItem;
	itemProps?: ItemPropsType;
	ItemRender: React.ElementType<ItemRenderProps>;
};
export type ItemRenderProps = {
	item: ChatItem;
	nextitem: ItemData;
	previtem: ItemData;
	itemref: any;
	itemProps: ItemPropsType;
	chatitem: ChatItem;
};

export const RowRender: React.FC<RowRenderProps> = (props: RowRenderProps) => {
	const itemref = React.useRef<any>();
	const [updateKey, forceUpdate] = useForceUpdate();
	const chatitem = props.item;
	chatitem.refreshFunction = forceUpdate;
	chatitem.itemref = itemref;
	return (
		<View ref={itemref} key={chatitem._id} id={'msg-' + chatitem._id}>
			<props.ItemRender
				itemref={itemref}
				chatitem={chatitem}
				item={chatitem.data}
				nextitem={chatitem.nextitem?.data}
				previtem={chatitem.previtem?.data}
				itemProps={props.itemProps}
			/>
		</View>
	);
};

export default VirtualChatList;
