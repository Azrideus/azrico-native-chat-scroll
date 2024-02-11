import React from 'react';

import { ChatItem } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { useForceUpdate } from './useForceUpdate';
import { useInfiniteQuery } from '@tanstack/react-query';

type Props = {
	chatManager: ChatManager;
	queryKey: string;
};

/**
 * sets up the `loadFunction` for the `chatManager`
 * @param props
 * @returns currently active `ChatItem` array on the `chatManager`
 */
export function useChatQuery({ chatManager, queryKey }: Props) {
	const [currentItems, set_currentItems] = React.useState<ChatItem[]>([]);
	const [updateKey, forceUpdate] = useForceUpdate();

	const {
		data,
		fetchNextPage,
		fetchPreviousPage,
		hasNextPage,
		hasPreviousPage,
		isFetchingNextPage,
		isFetchingPreviousPage,
	} = useInfiniteQuery({
		queryKey: [queryKey],
		queryFn: fetchData,
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => 1,
		getPreviousPageParam: (firstPage, allPages) => 1,
	});

	/* ------------------------------ initial setup ----------------------------- */
	const loadMoreOlderMessages = async () => {
	console.log('loadMoreOlderMessages');
	};

	const loadMoreRecentMessages = async () => {
	console.log('loadMoreRecentMessages');
	};

	function fetchData({ pageParam = 0 }): ChatItem[] {
		// props.loadFunction({ page: pageParam, })
		chatManager.fetch_page(pageParam);
		// return await fetch(`.../?page=${pageParam}`).then((res) => res.json()); //Should be of type Page
		return [];
	}
	return {
		loadMoreOlderMessages: loadMoreOlderMessages,
		loadMoreRecentMessages: loadMoreRecentMessages,
		currentItems: currentItems,
	};
}
