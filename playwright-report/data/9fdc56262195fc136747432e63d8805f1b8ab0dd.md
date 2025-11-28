# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Switch to dark mode" [ref=e3] [cursor=pointer]:
    - img [ref=e4]
  - generic [ref=e8]:
    - generic [ref=e9]:
      - heading "Customer Portal Login" [level=3] [ref=e10]
      - paragraph [ref=e11]: Enter your credentials to access your curated presentation
      - paragraph [ref=e12]: "Customer: accent-lighting-inc-alberta"
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - text: Username
          - textbox "Username" [active] [ref=e16]:
            - /placeholder: Enter username
        - generic [ref=e17]:
          - text: Password
          - textbox "Password" [ref=e18]:
            - /placeholder: ••••••••
        - button "Sign In" [ref=e19] [cursor=pointer]
      - paragraph [ref=e21]:
        - text: Rep access?
        - button "Rep portal login" [ref=e22] [cursor=pointer]
  - region "Notifications (F8)":
    - list
  - alert [ref=e23]
```