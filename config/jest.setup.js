import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

jest.mock("react", () => {
	const React = jest.requireActual("react");

	const Suspense = ({children}) => <div>{children}</div>;
	Suspense.displayName = "Suspense";

	const lazy = React.lazy(() =>
		Promise.resolve().then(() => ({
			default() {
				return null;
			},
		})),
	);
	lazy.displayName = "lazy";

	return {
		...React,
		//lazy,
		//Suspense,
	};
});

const Enzyme = require("enzyme");
const EnzymeAdapter = require("@wojtekmaj/enzyme-adapter-react-17");

Enzyme.configure({
	adapter: new EnzymeAdapter(),
});
