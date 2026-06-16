sap.ui.define([], function () {
  "use strict";

  return [
    {
      id: 1,
      title: "Two Sum",
      difficulty: "Easy",
      skill: ["beginner", "intermediate", "senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Arrays and Hashing",
      desc: "Given an array of integers <strong>nums</strong> and an integer <strong>target</strong>, return the indices of the two numbers such that they add up to <strong>target</strong>.<br><br>You may assume that each input would have exactly one solution, and you may not use the same element twice.",
      constraints: [
        "2 ≤ nums.length ≤ 10⁴",
        "-10⁹ ≤ nums[i] ≤ 10⁹",
        "-10⁹ ≤ target ≤ 10⁹",
        "Only one valid answer exists."
      ],
      examples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", note: "nums[0] + nums[1] == 9" },
        { input: "nums = [3,2,4], target = 6", output: "[1,2]", note: "nums[1] + nums[2] == 6" }
      ],
      starter: {
        JavaScript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};",
        Java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
        Python: "class Solution:\n    def twoSum(self, nums: list, target: int) -> list:\n        pass"
      }
    },
    {
      id: 2,
      title: "Valid Parentheses",
      difficulty: "Easy",
      skill: ["beginner", "intermediate", "senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Stack and Queue",
      desc: "Given a string <strong>s</strong> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is <strong>valid</strong>.<br><br>Open brackets must be closed by the same type and in the correct order.",
      constraints: [
        "1 ≤ s.length ≤ 10⁴",
        "s consists of parentheses only '()[]{}'"
      ],
      examples: [
        { input: 's = "()"', output: "true", note: "Single matching pair." },
        { input: 's = "()[]{}"', output: "true", note: "All three types match." },
        { input: 's = "(]"', output: "false", note: "Bracket types mismatch." }
      ],
      starter: {
        JavaScript: "/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};",
        Java: "class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}",
        Python: "class Solution:\n    def isValid(self, s: str) -> bool:\n        pass"
      }
    },
    {
      id: 3,
      title: "FizzBuzz",
      difficulty: "Easy",
      skill: ["beginner"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "General",
      desc: "Given an integer <strong>n</strong>, return a string array where:<br><ul><li><code>answer[i] == \"FizzBuzz\"</code> if i is divisible by 3 and 5.</li><li><code>answer[i] == \"Fizz\"</code> if i is divisible by 3.</li><li><code>answer[i] == \"Buzz\"</code> if i is divisible by 5.</li><li><code>answer[i] == i</code> (as a string) otherwise.</li></ul>",
      constraints: ["1 ≤ n ≤ 10⁴"],
      examples: [
        { input: "n = 3", output: '["1","2","Fizz"]', note: "3 is divisible by 3." },
        { input: "n = 15", output: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]', note: "15 is divisible by both." }
      ],
      starter: {
        JavaScript: "var fizzBuzz = function(n) {\n    \n};",
        Java: "class Solution {\n    public List<String> fizzBuzz(int n) {\n        \n    }\n}",
        Python: "class Solution:\n    def fizzBuzz(self, n: int) -> list:\n        pass"
      }
    },
    {
      id: 4,
      title: "Palindrome Check",
      difficulty: "Easy",
      skill: ["beginner", "intermediate"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Strings",
      desc: "Given a string <strong>s</strong>, return <code>true</code> if it is a <strong>palindrome</strong>, or <code>false</code> otherwise.<br><br>Consider only alphanumeric characters and ignore case.",
      constraints: [
        "1 ≤ s.length ≤ 2 × 10⁵",
        "s consists only of printable ASCII characters."
      ],
      examples: [
        { input: 's = "A man, a plan, a canal: Panama"', output: "true", note: "Alphanumeric: 'amanaplanacanalpanama'." },
        { input: 's = "race a car"', output: "false", note: "Not a palindrome." }
      ],
      starter: {
        JavaScript: "var isPalindrome = function(s) {\n    \n};",
        Java: "class Solution {\n    public boolean isPalindrome(String s) {\n        \n    }\n}",
        Python: "class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        pass"
      }
    },
    {
      id: 5,
      title: "Reverse a Linked List",
      difficulty: "Easy",
      skill: ["beginner", "intermediate", "senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Linked Lists",
      desc: "Given the <strong>head</strong> of a singly linked list, reverse the list, and return <strong>the reversed list</strong>.",
      constraints: [
        "The number of nodes is in range [0, 5000].",
        "-5000 ≤ Node.val ≤ 5000"
      ],
      examples: [
        { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]", note: "Reversed order." },
        { input: "head = [1,2]", output: "[2,1]", note: "Two node list." }
      ],
      starter: {
        JavaScript: "var reverseList = function(head) {\n    \n};",
        Java: "class Solution {\n    public ListNode reverseList(ListNode head) {\n        \n    }\n}",
        Python: "class Solution:\n    def reverseList(self, head):\n        pass"
      }
    },
    {
      id: 6,
      title: "Longest Substring Without Repeating Characters",
      difficulty: "Medium",
      skill: ["intermediate", "senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Strings",
      desc: "Given a string <strong>s</strong>, find the length of the <strong>longest substring</strong> without repeating characters.",
      constraints: [
        "0 ≤ s.length ≤ 5 × 10⁴",
        "s consists of English letters, digits, symbols and spaces."
      ],
      examples: [
        { input: 's = "abcabcbb"', output: "3", note: "Answer is 'abc' with length 3." },
        { input: 's = "bbbbb"', output: "1", note: "Answer is 'b' with length 1." },
        { input: 's = "pwwkew"', output: "3", note: "Answer is 'wke' with length 3." }
      ],
      starter: {
        JavaScript: "var lengthOfLongestSubstring = function(s) {\n    \n};",
        Java: "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        \n    }\n}",
        Python: "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        pass"
      }
    },
    {
      id: 7,
      title: "Maximum Subarray",
      difficulty: "Medium",
      skill: ["intermediate", "senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Arrays and Hashing",
      desc: "Given an integer array <strong>nums</strong>, find the <strong>subarray</strong> with the largest sum, and return its sum.",
      constraints: [
        "1 ≤ nums.length ≤ 10⁵",
        "-10⁴ ≤ nums[i] ≤ 10⁴"
      ],
      examples: [
        { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", note: "Subarray [4,-1,2,1] has sum = 6." },
        { input: "nums = [1]", output: "1", note: "Single element." }
      ],
      starter: {
        JavaScript: "var maxSubArray = function(nums) {\n    \n};",
        Java: "class Solution {\n    public int maxSubArray(int[] nums) {\n        \n    }\n}",
        Python: "class Solution:\n    def maxSubArray(self, nums: list) -> int:\n        pass"
      }
    },
    {
      id: 8,
      title: "Binary Tree Level Order Traversal",
      difficulty: "Medium",
      skill: ["intermediate", "senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Trees and Graphs",
      desc: "Given the <strong>root</strong> of a binary tree, return the <strong>level order traversal</strong> of its nodes' values (left to right, level by level).",
      constraints: [
        "The number of nodes is in range [0, 2000].",
        "-1000 ≤ Node.val ≤ 1000"
      ],
      examples: [
        { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]", note: "Three distinct levels." },
        { input: "root = [1]", output: "[[1]]", note: "Single root node." }
      ],
      starter: {
        JavaScript: "var levelOrder = function(root) {\n    \n};",
        Java: "class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        \n    }\n}",
        Python: "class Solution:\n    def levelOrder(self, root):\n        pass"
      }
    },
    {
      id: 9,
      title: "Coin Change",
      difficulty: "Medium",
      skill: ["intermediate", "senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Dynamic Programming",
      desc: "You are given an integer array <strong>coins</strong> representing coins of different denominations and an integer <strong>amount</strong>.<br><br>Return the <strong>fewest number of coins</strong> needed to make up that amount. If not possible, return <code>-1</code>.",
      constraints: [
        "1 ≤ coins.length ≤ 12",
        "1 ≤ coins[i] ≤ 2³¹ - 1",
        "0 ≤ amount ≤ 10⁴"
      ],
      examples: [
        { input: "coins = [1,5,11], amount = 15", output: "3", note: "15 = 5 + 5 + 5" },
        { input: "coins = [2], amount = 3", output: "-1", note: "Cannot make 3 with only 2s." }
      ],
      starter: {
        JavaScript: "var coinChange = function(coins, amount) {\n    \n};",
        Java: "class Solution {\n    public int coinChange(int[] coins, int amount) {\n        \n    }\n}",
        Python: "class Solution:\n    def coinChange(self, coins: list, amount: int) -> int:\n        pass"
      }
    },
    {
      id: 10,
      title: "Number of Islands",
      difficulty: "Medium",
      skill: ["intermediate", "senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Trees and Graphs",
      desc: "Given an <strong>m x n</strong> 2D binary grid of <code>'1'</code>s (land) and <code>'0'</code>s (water), return the <strong>number of islands</strong>.<br><br>An island is surrounded by water and formed by connecting adjacent lands horizontally or vertically.",
      constraints: [
        "m == grid.length",
        "n == grid[i].length",
        "1 ≤ m, n ≤ 300",
        "grid[i][j] is '0' or '1'"
      ],
      examples: [
        { input: 'grid = [["1","1","0"],["0","1","0"],["0","0","1"]]', output: "2", note: "Two separate islands." },
        { input: 'grid = [["1","1","1"],["1","1","1"]]', output: "1", note: "All land connected." }
      ],
      starter: {
        JavaScript: "var numIslands = function(grid) {\n    \n};",
        Java: "class Solution {\n    public int numIslands(char[][] grid) {\n        \n    }\n}",
        Python: "class Solution:\n    def numIslands(self, grid: list) -> int:\n        pass"
      }
    },
    {
      id: 11,
      title: "Merge K Sorted Lists",
      difficulty: "Hard",
      skill: ["senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Linked Lists",
      desc: "You are given an array of <strong>k</strong> linked-lists, each sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
      constraints: [
        "k == lists.length",
        "0 ≤ k ≤ 10⁴",
        "0 ≤ lists[i].length ≤ 500",
        "-10⁴ ≤ lists[i][j] ≤ 10⁴"
      ],
      examples: [
        { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]", note: "All three lists merged." },
        { input: "lists = []", output: "[]", note: "Empty input returns empty." }
      ],
      starter: {
        JavaScript: "var mergeKLists = function(lists) {\n    \n};",
        Java: "class Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        \n    }\n}",
        Python: "class Solution:\n    def mergeKLists(self, lists):\n        pass"
      }
    },
    {
      id: 12,
      title: "Word Break",
      difficulty: "Hard",
      skill: ["senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Dynamic Programming",
      desc: "Given a string <strong>s</strong> and a dictionary <strong>wordDict</strong>, return <code>true</code> if <strong>s</strong> can be segmented into a space-separated sequence of dictionary words.",
      constraints: [
        "1 ≤ s.length ≤ 300",
        "1 ≤ wordDict.length ≤ 1000",
        "s and wordDict[i] consist of only lowercase English letters."
      ],
      examples: [
        { input: 's = "leetcode", wordDict = ["leet","code"]', output: "true", note: '"leetcode" = "leet" + "code".' },
        { input: 's = "applepenapple", wordDict = ["apple","pen"]', output: "true", note: '"apple" + "pen" + "apple".' }
      ],
      starter: {
        JavaScript: "var wordBreak = function(s, wordDict) {\n    \n};",
        Java: "class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        \n    }\n}",
        Python: "class Solution:\n    def wordBreak(self, s: str, wordDict: list) -> bool:\n        pass"
      }
    },
    {
      id: 13,
      title: "Trapping Rain Water",
      difficulty: "Hard",
      skill: ["senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Arrays and Hashing",
      desc: "Given <strong>n</strong> non-negative integers representing an elevation map where the width of each bar is <code>1</code>, compute how much water it can trap after raining.",
      constraints: [
        "n == height.length",
        "1 ≤ n ≤ 2 × 10⁴",
        "0 ≤ height[i] ≤ 10⁵"
      ],
      examples: [
        { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", note: "6 units of water trapped." },
        { input: "height = [4,2,0,3,2,5]", output: "9", note: "9 units of water trapped." }
      ],
      starter: {
        JavaScript: "var trap = function(height) {\n    \n};",
        Java: "class Solution {\n    public int trap(int[] height) {\n        \n    }\n}",
        Python: "class Solution:\n    def trap(self, height: list) -> int:\n        pass"
      }
    },
    {
      id: 14,
      title: "LRU Cache",
      difficulty: "Hard",
      skill: ["senior", "expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Stack and Queue",
      desc: "Design a data structure that follows the <strong>Least Recently Used (LRU)</strong> cache constraint.<br><br>Implement <code>get(key)</code> and <code>put(key, value)</code>, each running in <strong>O(1)</strong> average time.",
      constraints: [
        "1 ≤ capacity ≤ 3000",
        "0 ≤ key ≤ 10⁴",
        "At most 2 × 10⁵ calls to get and put."
      ],
      examples: [
        { input: "LRUCache(2), put(1,1), put(2,2), get(1), put(3,3), get(2)", output: "[null,null,null,1,null,-1]", note: "Key 2 was evicted when key 3 was added." }
      ],
      starter: {
        JavaScript: "class LRUCache {\n    constructor(capacity) {\n        \n    }\n    get(key) {\n        \n    }\n    put(key, value) {\n        \n    }\n}",
        Java: "class LRUCache {\n    public LRUCache(int capacity) {\n        \n    }\n    public int get(int key) {\n        \n    }\n    public void put(int key, int value) {\n        \n    }\n}",
        Python: "class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass"
      }
    },
    {
      id: 15,
      title: "Median of Two Sorted Arrays",
      difficulty: "Hard",
      skill: ["expert"],
      languages: ["JavaScript", "Java", "Python"],
      topic: "Sorting and Searching",
      desc: "Given two sorted arrays <strong>nums1</strong> and <strong>nums2</strong>, return the <strong>median</strong> of the two sorted arrays. The overall run time complexity should be <strong>O(log(m+n))</strong>.",
      constraints: [
        "0 ≤ m, n ≤ 1000",
        "1 ≤ m + n ≤ 2000",
        "-10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶"
      ],
      examples: [
        { input: "nums1 = [1,3], nums2 = [2]", output: "2.00000", note: "Merged: [1,2,3], median is 2." },
        { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.50000", note: "Merged: [1,2,3,4], median is 2.5." }
      ],
      starter: {
        JavaScript: "var findMedianSortedArrays = function(nums1, nums2) {\n    \n};",
        Java: "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        \n    }\n}",
        Python: "class Solution:\n    def findMedianSortedArrays(self, nums1: list, nums2: list) -> float:\n        pass"
      }
    }
  ];
});
