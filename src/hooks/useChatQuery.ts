import React from 'react';

import { ChatItem } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { useForceUpdate } from './useForceUpdate';
import { useInfiniteQuery } from '@tanstack/react-query';

type Props = {
	chatManager: ChatManager;
};

/**
 * sets up the `loadFunction` for the `chatManager`
 * @param props
 * @returns currently active `ChatItem` array on the `chatManager`
 */
export function useChatQuery({ chatManager }: Props) {
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
		queryKey: ['queryKey'],
		queryFn: fetchData,
		initialPageParam: 1,
		getNextPageParam: (lastPage, allPages) => 1,
		getPreviousPageParam: (firstPage, allPages) => 1,
	});
	
	
	/* ------------------------------ initial setup ----------------------------- */
	const loadMoreOlderMessages = async () => {};

	const loadMoreRecentMessages = async () => {};

	
	function fetchData({ pageParam = 0 }): ChatItem[] {
		// props.loadFunction({ page: pageParam, })
		console.log('fetchpage:', pageParam);
		// return await fetch(`.../?page=${pageParam}`).then((res) => res.json()); //Should be of type Page
		return [];
	}
	return {
		loadMoreOlderMessages: loadMoreOlderMessages,
		loadMoreRecentMessages: loadMoreRecentMessages,
		currentItems: currentItems,
	};
}
