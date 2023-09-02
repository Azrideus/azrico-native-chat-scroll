module.exports = {
	rootDir: ".",
	preset: "react-native",
	moduleNameMapper: {
		"\\.(css|less|scss|sass)$": "identity-obj-proxy",
		"^@/(.*)$": "<rootDir>/$1",
	},
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	testMatch: ["./**/__tests__/**/*.(js|ts|tsx)"],
	testPathIgnorePatterns: ["\\.snap$", "<rootDir>/node_modules/"],
	transformIgnorePatterns: ["node_modules/?!(static-container)"],
	cacheDirectory: ".jest/cache",
	globals: {
		"ts-jest": {
			isolatedModules: true,
		},
	},
	clearMocks: true,
	//collectCoverageFrom: ["src/**/*.{ts,tsx}", "!**/node_modules/**"],
	testEnvironment: "jsdom",
	setupFilesAfterEnv: ["../../config/jest.setup.js"],
};
