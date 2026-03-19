```mermaid
flowchart TD
    A[用户与 SimpleBank 合约交互] --> B{操作类型}

    B --> C[直接向合约转入 ETH]
    B --> D[调用 deposit 并附带 ETH]
    B --> E[调用 withdraw]

    C --> F[触发 receive]
    D --> G[执行 deposit]
    F --> H[进入 _deposit]
    G --> H

    H --> I{金额是否为 0}
    I -- 是 --> J[回退 ZeroAmount]
    I -- 否 --> K[更新用户余额]
    K --> L[更新总记账余额]
    L --> M[触发 Deposited 事件]
    M --> N[校验 总记账余额 等于 合约真实余额]
    N --> O[存款成功]

    E --> P{金额是否为 0}
    P -- 是 --> Q[回退 ZeroAmount]
    P -- 否 --> R[读取用户余额]
    R --> S{提现金额是否大于用户余额}
    S -- 是 --> T[回退 InsufficientBalance]
    S -- 否 --> U[扣减用户余额]
    U --> V[扣减总记账余额]
    V --> W[向用户转出 ETH]
    W --> X{转账是否成功}
    X -- 否 --> Y[回退 ETH_TRANSFER_FAILED]
    X -- 是 --> Z[触发 Withdrawn 事件]
    Z --> AA[校验 总记账余额 等于 合约真实余额]
    AA --> AB[提现成功]
  ```