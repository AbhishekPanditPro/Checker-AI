
def minCoins(n, arr: list[int]):
    
    mincounter = float("inf")
    def helper(totalSum, counter):
        nonlocal mincounter
        if totalSum < 0:
            return 
        if totalSum == 0:
            mincounter = min(mincounter, counter)


        for each in reversed(arr):
            if totalSum >= each:
                helper(totalSum - each, counter + 1)
    
    helper(n, 0)
    
    return mincounter

            
    


print(minCoins(12, [5,1,2]))





# def minCoins(n, arr: list[int]):

#     dp = [n + 1] * (n + 1)
#     dp[0] = 0
    
#     for i in range(1, len(dp)):
#         for each in arr:
#             if i - each >= 0:
#                 dp[i] = min(dp[i], 1 + dp[i - each])

#     print(dp)
#     return dp[n]
            
    


# print(minCoins(11, [1,2,5]))