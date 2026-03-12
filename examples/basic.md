# Intent Compiler Example

Input:

```
intent --text "Write an article about AI startup risks" --tone analytical --length "1200 words"
```

Output (simplified):

```
intent: {
  task: write_article,
  topic: AI startup risks,
  audience: general,
  tone: analytical,
  length: 1200 words
}

compiled prompt: You are an experienced editor...
```
